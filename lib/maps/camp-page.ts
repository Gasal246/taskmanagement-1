import mongoose from "mongoose";
import Camps from "@/models/eq_camps.model";
import Enquiries from "@/models/eq_enquiries.model";
import { ENQUIRY_MAP_STATUS_GROUPS, normalizeCampVisitedStatusForMap } from "@/lib/enquiries/camp-visited-status";
import type { MapBounds } from "./types";
import Countries from "@/models/eq_countries.model";
import Regions from "@/models/eq_region.model";
import Provinces from "@/models/eq_province.model";
import Cities from "@/models/eq_city.model";
import Areas from "@/models/eq_area.model";

export class MapQueryError extends Error {}
const emptySummary = () => ({ total: 0, visited: 0, toVisit: 0, awarded: 0, cancelled: 0, justAdded: 0 });
const summaryKey = (status: string) => ({ Visited: "visited", "To Visit": "toVisit", Awarded: "awarded", "On Hold / Cancelled": "cancelled", "Just Added": "justAdded" }[status] || "justAdded") as keyof ReturnType<typeof emptySummary>;
export function parseMapQuery(params: URLSearchParams) {
  const mode = params.get("mode") || "overview";
  if (!["overview", "viewport", "list"].includes(mode)) throw new MapQueryError("Invalid map view");
  const query: any = {};
  for (const field of ["country_id", "region_id", "province_id"]) {
    const value = params.get(field);
    if (value) {
      if (!mongoose.Types.ObjectId.isValid(value)) throw new MapQueryError("Invalid location filter");
      query[field] = new mongoose.Types.ObjectId(value);
    }
  }
  let bounds: MapBounds | undefined;
  const fields = ["south", "west", "north", "east"] as const;
  if (fields.some(field => params.has(field))) {
    const numbers = fields.map(field => params.get(field)?.trim() ? Number(params.get(field)) : NaN);
    const [south, west, north, east] = numbers;
    if (numbers.some(value => !Number.isFinite(value)) || south < -90 || north > 90 || south >= north || west < -180 || west > 180 || east < -180 || east > 180 || west === east) throw new MapQueryError("Invalid map bounds");
    bounds = { south, west, north, east };
  }
  if (mode === "viewport" && !bounds) throw new MapQueryError("Map bounds are required");
  const zoom = Number(params.get("zoom") || 5), page = Number(params.get("page") || 1), limit = Number(params.get("limit") || 50);
  if (!Number.isFinite(zoom) || zoom < 0 || zoom > 22 || !Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new MapQueryError("Invalid map page or zoom");
  const search = (params.get("search") || "").trim();
  if (search.length > 100) throw new MapQueryError("Search is limited to 100 characters");
  return { mode, query, bounds, zoom, page, limit, search };
}

// Validate each coordinate pair together. Never mix one enquiry coordinate with
// one facility coordinate, or convert blank strings into a pin at zero.
const coordinateNumber = (field: string) => ({ $convert: {
  input: { $trim: { input: { $convert: { input: field, to: "string", onError: "", onNull: "" } } } },
  to: "double", onError: null, onNull: null,
} });
const coordinatePoint = (latitude: string, longitude: string) => ({ $let: {
  vars: { lat: coordinateNumber(latitude), lng: coordinateNumber(longitude) },
  in: { $cond: [{ $and: [
    { $ne: ["$$lat", null] }, { $ne: ["$$lng", null] },
    { $gte: ["$$lat", -90] }, { $lte: ["$$lat", 90] },
    { $gte: ["$$lng", -180] }, { $lte: ["$$lng", 180] },
  ] }, ["$$lng", "$$lat"], null] },
} });

function facilityStages(scope: Record<string, any>, geography: Record<string, any>, visibilityStages: any[]): any[] {
  return [
    // Apply enquiry visibility and ownership before reading any facility data.
    ...visibilityStages,
    { $match: scope },
    { $sort: { createdAt: -1, _id: -1 } },
    // One marker per facility. If legacy duplicates exist, the newest enquiry
    // within the authorized scope supplies the status and coordinates.
    { $group: { _id: "$camp_id", enquiry: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$enquiry" } },
    { $lookup: { from: Camps.collection.name, localField: "camp_id", foreignField: "_id", as: "facility" } },
    { $unwind: "$facility" },
    { $set: {
      map_point: { $ifNull: [coordinatePoint("$latitude", "$longitude"), coordinatePoint("$facility.latitude", "$facility.longitude")] },
      visited_status: { $cond: [
        { $or: [{ $eq: ["$is_active", false] }, { $eq: ["$facility.is_active", false] }] },
        "Just Added",
        { $switch: {
          branches: ENQUIRY_MAP_STATUS_GROUPS.map(group => ({
            case: { $in: [{ $trim: { input: { $ifNull: ["$status", ""] } } }, group.values] },
            then: normalizeCampVisitedStatusForMap(group.status),
          })),
          default: "Just Added",
        } },
      ] },
      ...Object.fromEntries(["country_id", "region_id", "province_id", "city_id", "area_id"].map(field => [field, { $ifNull: [`$${field}`, `$facility.${field}`] }])),
    } },
    { $match: geography },
    { $project: {
      _id: "$camp_id", enquiry_id: "$_id", camp_name: "$facility.camp_name", camp_type: "$facility.camp_type",
      camp_capacity: "$facility.camp_capacity", camp_occupancy: "$facility.camp_occupancy",
      map_point: 1, visited_status: 1, country_id: 1, region_id: 1, province_id: 1, city_id: 1, area_id: 1,
    } },
  ];
}

function pointFilter(bounds?: MapBounds) {
  if (!bounds) return { map_point: { $ne: null } };
  const { south, west, north, east } = bounds;
  const latitude = { "map_point.1": { $gte: south, $lte: north } };
  // A map crossing the date line is two longitude ranges.
  return west <= east
    ? { ...latitude, "map_point.0": { $gte: west, $lte: east } }
    : { ...latitude, $or: [{ "map_point.0": { $gte: west } }, { "map_point.0": { $lte: east } }] };
}

async function campItems(rows: any[]) {
  if (!rows.length) return [];
  // Populate only returned markers/list rows. Keep the enquiry's resolved status
  // and coordinates instead of reading a second, unscoped facility result.
  await Camps.populate(rows, [
    { path: "country_id", select: "country_name" }, { path: "region_id", select: "region_name" },
    { path: "province_id", select: "province_name" }, { path: "city_id", select: "city_name" }, { path: "area_id", select: "area_name" },
  ]);
  return rows.map(camp => ({
    _id: String(camp._id), enquiry_id: String(camp.enquiry_id), camp_name: camp.camp_name || "Unnamed camp", camp_type: camp.camp_type || "", camp_capacity: camp.camp_capacity || "", camp_occupancy: camp.camp_occupancy ?? null,
    visited_status: camp.visited_status, longitude: camp.map_point[0], latitude: camp.map_point[1],
    country: camp.country_id?.country_name || "", region: camp.region_id?.region_name || "", province: camp.province_id?.province_name || "", city: camp.city_id?.city_name || "", area: camp.area_id?.area_name || "",
  }));
}

export async function campMapPage(params: URLSearchParams, scope: Record<string, any>, visibilityStages: any[] = []) {
  const { mode, query, bounds, zoom, page, limit, search } = parseMapQuery(params);
  const base = facilityStages(scope, query, visibilityStages);
  if (mode === "overview") {
    const [result] = await Enquiries.aggregate([...base, { $facet: {
      mapped: [{ $match: pointFilter(bounds) }, { $group: { _id: "$visited_status", count: { $sum: 1 },
        west: { $min: { $arrayElemAt: ["$map_point", 0] } }, east: { $max: { $arrayElemAt: ["$map_point", 0] } },
        south: { $min: { $arrayElemAt: ["$map_point", 1] } }, north: { $max: { $arrayElemAt: ["$map_point", 1] } },
      } }],
      unmapped: [{ $match: { map_point: null } }, { $count: "total" }],
    } }]).allowDiskUse(true);
    const rows = result.mapped;
    const summary = emptySummary();
    for (const row of rows) { summary.total += row.count; summary[summaryKey(row._id)] += row.count; }
    return { status: 200, summary, unmappedTotal: result.unmapped[0]?.total || 0, bounds: rows.length ? { west: Math.min(...rows.map((r: any) => r.west)), east: Math.max(...rows.map((r: any) => r.east)), south: Math.min(...rows.map((r: any) => r.south)), north: Math.max(...rows.map((r: any) => r.north)) } : null };
  }
  const pipeline: any[] = [...base, { $match: pointFilter(bounds) }];
  if (mode === "list") {
    if (search) {
      const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Location-name search runs in MongoDB before pagination; only the page is populated.
      for (const [field, related, name] of [["country_id", Countries, "country_name"], ["region_id", Regions, "region_name"], ["province_id", Provinces, "province_name"], ["city_id", Cities, "city_name"], ["area_id", Areas, "area_name"]] as const) {
        pipeline.push({ $lookup: { from: related.collection.name, localField: field, foreignField: "_id", pipeline: [{ $project: { [name]: 1 } }], as: `_${name}` } });
      }
      pipeline.push({ $set: { _coordinates: { $concat: [{ $toString: { $arrayElemAt: ["$map_point", 1] } }, ", ", { $toString: { $arrayElemAt: ["$map_point", 0] } }] } } },
        { $match: { $or: ["camp_name", "_coordinates", "_country_name.country_name", "_region_name.region_name", "_province_name.province_name", "_city_name.city_name", "_area_name.area_name"].map(field => ({ [field]: { $regex: literal, $options: "i" } })) } });
    }
    const [result] = await Enquiries.aggregate([...pipeline, { $facet: { count: [{ $count: "total" }], rows: [{ $sort: { camp_name: 1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }] } }]).allowDiskUse(true);
    const total = result.count[0]?.total || 0;
    return { status: 200, camps: await campItems(result.rows), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  }
  const lngSpan = bounds!.east >= bounds!.west ? bounds!.east - bounds!.west : 360 - bounds!.west + bounds!.east;
  // At most about 22 x 22 cells, independent of dataset size and device dimensions.
  const cell = Math.max(360 / 2 ** zoom / 4, lngSpan / 20, (bounds!.north - bounds!.south) / 20, 0.000001);
  const rows = await Enquiries.aggregate([...pipeline, { $group: {
    _id: { x: { $floor: { $divide: [{ $add: [{ $arrayElemAt: ["$map_point", 0] }, 180] }, cell] } }, y: { $floor: { $divide: [{ $add: [{ $arrayElemAt: ["$map_point", 1] }, 90] }, cell] } } },
    count: { $sum: 1 }, camp: { $first: "$$ROOT" }, latitude: { $avg: { $arrayElemAt: ["$map_point", 1] } }, longitude: { $avg: { $arrayElemAt: ["$map_point", 0] } },
    south: { $min: { $arrayElemAt: ["$map_point", 1] } }, north: { $max: { $arrayElemAt: ["$map_point", 1] } }, west: { $min: { $arrayElemAt: ["$map_point", 0] } }, east: { $max: { $arrayElemAt: ["$map_point", 0] } },
  } }, { $sort: { "_id.x": 1, "_id.y": 1 } }]).allowDiskUse(true);
  // Groups carry one facility, never an array of every facility in the cell.
  return { status: 200, visibleTotal: rows.reduce((total, row) => total + row.count, 0), camps: await campItems(rows.filter(row => row.count === 1).map(row => row.camp)),
    clusters: rows.filter(row => row.count > 1).map(row => ({ id: `${row._id.x}:${row._id.y}`, count: row.count, latitude: row.latitude, longitude: row.longitude, bounds: { south: row.south, north: row.north, west: row.west, east: row.east } })),
  };
}
