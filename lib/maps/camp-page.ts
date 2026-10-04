import mongoose from "mongoose";
import Camps from "@/models/eq_camps.model";
import { normalizeCampVisitedStatusForMap } from "@/lib/enquiries/camp-visited-status";
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
  const query: any = { is_active: true, "map_point.0": { $exists: true } };
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
    const box = (left: number, right: number) => ({ map_point: { $geoWithin: { $box: [[left, south], [right, north]] } } });
    // A map crossing the date line is two rectangles, not a nearly world-wide box.
    Object.assign(query, west <= east ? box(west, east) : { $or: [box(west, 180), box(-180, east)] });
  }
  if (mode === "viewport" && !bounds) throw new MapQueryError("Map bounds are required");
  const zoom = Number(params.get("zoom") || 5), page = Number(params.get("page") || 1), limit = Number(params.get("limit") || 50);
  if (!Number.isFinite(zoom) || zoom < 0 || zoom > 22 || !Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new MapQueryError("Invalid map page or zoom");
  const search = (params.get("search") || "").trim();
  if (search.length > 100) throw new MapQueryError("Search is limited to 100 characters");
  return { mode, query, bounds, zoom, page, limit, search };
}
async function campItems(ids: any[]) {
  if (!ids.length) return [];
  const rows = await Camps.find({ _id: { $in: ids } }).select("camp_name camp_type camp_capacity camp_occupancy visited_status map_point country_id region_id province_id city_id area_id")
    .populate({ path: "country_id", select: "country_name" }).populate({ path: "region_id", select: "region_name" })
    .populate({ path: "province_id", select: "province_name" }).populate({ path: "city_id", select: "city_name" }).populate({ path: "area_id", select: "area_name" }).lean();
  const byId = new Map(rows.map((row: any) => [String(row._id), row]));
  return ids.map(id => byId.get(String(id))).filter(Boolean).map((camp: any) => ({
    _id: String(camp._id), camp_name: camp.camp_name || "Unnamed camp", camp_type: camp.camp_type || "", camp_capacity: camp.camp_capacity || "", camp_occupancy: camp.camp_occupancy ?? null,
    visited_status: normalizeCampVisitedStatusForMap(camp.visited_status), longitude: camp.map_point[0], latitude: camp.map_point[1],
    country: camp.country_id?.country_name || "", region: camp.region_id?.region_name || "", province: camp.province_id?.province_name || "", city: camp.city_id?.city_name || "", area: camp.area_id?.area_name || "",
  }));
}
export async function campMapPage(params: URLSearchParams) {
  const { mode, query, bounds, zoom, page, limit, search } = parseMapQuery(params);
  if (mode === "overview") {
    const rows = await Camps.aggregate([{ $match: query }, { $group: { _id: "$visited_status", count: { $sum: 1 },
      west: { $min: { $arrayElemAt: ["$map_point", 0] } }, east: { $max: { $arrayElemAt: ["$map_point", 0] } },
      south: { $min: { $arrayElemAt: ["$map_point", 1] } }, north: { $max: { $arrayElemAt: ["$map_point", 1] } },
    } }]);
    const summary = emptySummary();
    for (const row of rows) { summary.total += row.count; summary[summaryKey(normalizeCampVisitedStatusForMap(row._id))] += row.count; }
    return { status: 200, summary, bounds: rows.length ? { west: Math.min(...rows.map(r => r.west)), east: Math.max(...rows.map(r => r.east)), south: Math.min(...rows.map(r => r.south)), north: Math.max(...rows.map(r => r.north)) } : null };
  }
  if (mode === "list") {
    const pipeline: any[] = [{ $match: query }];
    if (search) {
      const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Location-name search runs in MongoDB before pagination; only the page is populated.
      for (const [field, related, name] of [["country_id", Countries, "country_name"], ["region_id", Regions, "region_name"], ["province_id", Provinces, "province_name"], ["city_id", Cities, "city_name"], ["area_id", Areas, "area_name"]] as const) {
        pipeline.push({ $lookup: { from: related.collection.name, localField: field, foreignField: "_id", pipeline: [{ $project: { [name]: 1 } }], as: `_${name}` } });
      }
      pipeline.push({ $set: { _coordinates: { $concat: [{ $toString: { $arrayElemAt: ["$map_point", 1] } }, ", ", { $toString: { $arrayElemAt: ["$map_point", 0] } }] } } },
        { $match: { $or: ["camp_name", "_coordinates", "_country_name.country_name", "_region_name.region_name", "_province_name.province_name", "_city_name.city_name", "_area_name.area_name"].map(field => ({ [field]: { $regex: literal, $options: "i" } })) } });
    }
    const [result] = await Camps.aggregate([...pipeline, { $facet: { count: [{ $count: "total" }], ids: [{ $sort: { camp_name: 1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1 } }] } }]).allowDiskUse(true);
    const total = result.count[0]?.total || 0;
    return { status: 200, camps: await campItems(result.ids.map((row: any) => row._id)), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  }
  const lngSpan = bounds!.east >= bounds!.west ? bounds!.east - bounds!.west : 360 - bounds!.west + bounds!.east;
  // At most about 22 x 22 cells, independent of dataset size and device dimensions.
  const cell = Math.max(360 / 2 ** zoom / 4, lngSpan / 20, (bounds!.north - bounds!.south) / 20, 0.000001);
  const rows = await Camps.aggregate([{ $match: query }, { $group: {
    _id: { x: { $floor: { $divide: [{ $add: [{ $arrayElemAt: ["$map_point", 0] }, 180] }, cell] } }, y: { $floor: { $divide: [{ $add: [{ $arrayElemAt: ["$map_point", 1] }, 90] }, cell] } } },
    count: { $sum: 1 }, campId: { $first: "$_id" }, latitude: { $avg: { $arrayElemAt: ["$map_point", 1] } }, longitude: { $avg: { $arrayElemAt: ["$map_point", 0] } },
    south: { $min: { $arrayElemAt: ["$map_point", 1] } }, north: { $max: { $arrayElemAt: ["$map_point", 1] } }, west: { $min: { $arrayElemAt: ["$map_point", 0] } }, east: { $max: { $arrayElemAt: ["$map_point", 0] } },
  } }, { $sort: { "_id.x": 1, "_id.y": 1 } }]);
  // Groups carry one ID, never an array of all facility IDs.
  return { status: 200, visibleTotal: rows.reduce((total, row) => total + row.count, 0), camps: await campItems(rows.filter(row => row.count === 1).map(row => row.campId)),
    clusters: rows.filter(row => row.count > 1).map(row => ({ id: `${row._id.x}:${row._id.y}`, count: row.count, latitude: row.latitude, longitude: row.longitude, bounds: { south: row.south, north: row.north, west: row.west, east: row.east } })),
  };
}
