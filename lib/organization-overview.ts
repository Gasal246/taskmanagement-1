import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { authorizeOrganizationRead } from "@/lib/organization-access";
import Users from "@/models/users.model";
import Regions from "@/models/business_regions.model";
import Areas from "@/models/business_areas.model";
import Locations from "@/models/business_locations.model";
import Departments from "@/models/business_departments.model";
import RegionDepartments from "@/models/region_departments.model";
import AreaDepartments from "@/models/area_departments.model";
import LocationDepartments from "@/models/location_departments.model";
import RegionHeads from "@/models/region_heads.model";
import RegionStaff from "@/models/region_staffs.model";
import AreaHeads from "@/models/area_heads.model";
import AreaStaff from "@/models/area_staffs.model";
import LocationHeads from "@/models/location_heads.model";
import LocationStaff from "@/models/location_staffs.model";
import RegionDepartmentHeads from "@/models/region_dep_heads.model";
import RegionDepartmentStaff from "@/models/region_dep_staffs.model";
import AreaDepartmentHeads from "@/models/area_dep_heads.model";
import AreaDepartmentStaff from "@/models/area_dep_staffs.model";
import LocationDepartmentHeads from "@/models/location_dep_heads.model";
import LocationDepartmentStaff from "@/models/location_dep_staffs.model";
import DepartmentHeads from "@/models/department_heads.model";
import DepartmentStaff from "@/models/department_staffs.model";
import DepartmentRegions from "@/models/department_regions.model";
import DepartmentAreas from "@/models/department_areas.model";
import BusinessStaff from "@/models/business_staffs.model";
import UserRegions from "@/models/user_regions.model";
import UserLocations from "@/models/user_locations.model";

const userProjection = { _id: 1, name: 1, email: 1, phone: 1, avatar_url: 1, status: 1, admin_id: 1, last_login: 1, last_logout: 1 };
type Join = { model: any; field: string; as: string; projection?: Record<string, number>; required?: boolean; match?: (organization: any) => Record<string, any>; foreignField?: string };
type Section = { model: any; filter: (organization: any) => Record<string, any>; search: string[]; joins?: Join[]; summary?: boolean; base?: (organization: any) => any[] };
type Overview = { model: any; id: string; sections: Record<string, Section> };

const direct = (model: any, parent: string, name: string): Section => ({ model, filter: org => ({ [parent]: org._id, status: 1 }), search: [name] });
const people = (model: any, parent: string, field = "user_id", as = "user"): Section => ({
  ...direct(model, parent, `${as}.name`), search: [`${as}.name`, `${as}.email`, `${as}.phone`],
  joins: [{ model: Users, field, as, projection: userProjection }],
});
const link = (model: any, parent: string, field: string, target: any, name: string): Section => ({
  ...direct(model, parent, `${field}.${name}`), joins: [{ model: target, field, as: field, projection: { _id: 1, [name]: 1, region_id: 1 } }],
});
const candidates = (model: any, parent: string, resourceField: string): Section => ({
  ...people(model, parent, "user_id", "user_id"), summary: false,
  filter: org => ({ [parent]: org[resourceField], status: 1 }),
  joins: [{ model: Users, field: "user_id", as: "user_id", projection: userProjection, required: true, match: () => ({ status: 1 }) }],
});
const businessCandidates = candidates(BusinessStaff, "business_id", "business_id");
const areaCandidates: Section = {
  ...candidates(AreaStaff, "area_id", "area_id"),
  base: org => [
    { $project: { _id: 0, user_id: "$staff_id" } },
    { $unionWith: { coll: AreaHeads.collection.name, pipeline: [
      { $match: { area_id: org.area_id, status: 1 } }, { $project: { _id: 0, user_id: 1 } },
    ] } },
    { $group: { _id: "$user_id" } }, { $set: { user_id: "$_id" } },
  ],
};

// The API and its consumers share section names, while all database filters are server-owned.
const overviews: Record<string, Overview> = {
  region: { model: Regions, id: "region_id", sections: {
    available_staffs: businessCandidates,
    heads: people(RegionHeads, "region_id"), staffs: people(RegionStaff, "region_id", "staff_id"),
    areas: direct(Areas, "region_id", "area_name"), departments: direct(RegionDepartments, "region_id", "dep_name"),
  } },
  area: { model: Areas, id: "area_id", sections: {
    available_staffs: businessCandidates,
    heads: people(AreaHeads, "area_id"), staffs: people(AreaStaff, "area_id", "staff_id"),
    locations: direct(Locations, "area_id", "location_name"), departments: direct(AreaDepartments, "area_id", "dep_name"),
  } },
  location: { model: Locations, id: "loc_id", sections: {
    available_staffs: businessCandidates,
    heads: people(LocationHeads, "location_id"), staffs: people(LocationStaff, "location_id"),
    departments: direct(LocationDepartments, "location_id", "dep_name"),
  } },
  "region-department": { model: RegionDepartments, id: "region_dep_id", sections: {
    available_staffs: candidates(UserRegions, "region_id", "region_id"),
    heads: people(RegionDepartmentHeads, "reg_dep_id"), staffs: people(RegionDepartmentStaff, "region_dep_id"),
    area_departments: { model: AreaDepartments, filter: org => ({ type: org.type, status: 1 }), search: ["dep_name", "type", "area.area_name"],
      // Resolve ancestry through the stored parent, including legacy rows without region_id.
      joins: [{ model: Areas, field: "area_id", as: "area", required: true,
        match: org => ({ region_id: org.region_id, status: 1 }), projection: { _id: 1, area_name: 1, region_id: 1, business_id: 1 } }],
    },
  } },
  "area-department": { model: AreaDepartments, id: "area_dep_id", sections: {
    available_staffs: areaCandidates,
    heads: people(AreaDepartmentHeads, "area_dep_id"), staffs: people(AreaDepartmentStaff, "area_dep_id"),
    subdeps: { model: LocationDepartments, filter: org => ({ area_id: org.area_id, type: org.type, status: 1 }), search: ["dep_name", "type", "location.location_name"],
      joins: [{ model: Locations, field: "location_id", as: "location", required: true,
        match: org => ({ area_id: org.area_id, status: 1 }), projection: { _id: 1, location_name: 1, area_id: 1, region_id: 1 } }],
    },
  } },
  "location-department": { model: LocationDepartments, id: "location_dep_id", sections: {
    available_staffs: candidates(UserLocations, "location_id", "location_id"),
    heads: people(LocationDepartmentHeads, "location_dep_id"), staffs: people(LocationDepartmentStaff, "location_dep_id"),
  } },
  department: { model: Departments, id: "dep_id", sections: {
    available_staffs: businessCandidates,
    heads: people(DepartmentHeads, "dep_id", "user_id", "user_id"), staffs: people(DepartmentStaff, "dep_id", "staff_id", "staff_id"),
    regions: link(DepartmentRegions, "department_id", "business_region_id", Regions, "region_name"),
    areas: link(DepartmentAreas, "dep_id", "area_id", Areas, "area_name"),
    available_regions: { model: Regions, filter: org => ({ business_id: org.business_id, status: 1 }), search: ["region_name"], summary: false },
    available_areas: { model: Areas, filter: org => ({ business_id: org.business_id, status: 1 }), search: ["area_name"], summary: false,
      joins: [{ model: DepartmentRegions, field: "region_id", foreignField: "business_region_id", as: "_department_region", required: true,
        match: org => ({ department_id: org._id, status: 1 }), projection: { _id: 1 } }],
    },
  } },
};

function joinStages(join: Join, organization: any): any[] {
  // Keep the local scalar reference when it is also the populated result key.
  const temporary = `_overview_${join.as}`;
  return [
    { $lookup: { from: join.model.collection.name, localField: join.field, foreignField: join.foreignField || "_id", as: temporary,
      pipeline: [...(join.match ? [{ $match: join.match(organization) }] : []), ...(join.projection ? [{ $project: join.projection }] : []), { $limit: 1 }] } },
    { $unwind: { path: `$${temporary}`, preserveNullAndEmptyArrays: !join.required } },
    { $set: { [join.as]: { $ifNull: [`$${temporary}`, null] } } },
    { $unset: temporary },
  ];
}

async function sectionCount(section: Section, organization: any) {
  const required = (section.joins || []).filter(join => join.required);
  if (!required.length && !section.base) return section.model.countDocuments(section.filter(organization));
  const result = await section.model.aggregate([
    { $match: section.filter(organization) }, ...(section.base?.(organization) || []), ...required.flatMap(join => joinStages(join, organization)), { $count: "total" },
  ]);
  return result[0]?.total || 0;
}

async function sectionPage(section: Section, organization: any, page: number, limit: number, search: string) {
  const joins = section.joins || [];
  // Required ancestry joins constrain counts; other population happens only after limiting, unless searched.
  const before = joins.filter(join => join.required || search);
  const after = joins.filter(join => !before.includes(join));
  const base: any[] = [{ $match: section.filter(organization) }, ...(section.base?.(organization) || []), ...before.flatMap(join => joinStages(join, organization))];
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    base.push({ $match: { $or: section.search.map(field => ({ [field]: { $regex: literal, $options: "i" } })) } });
  }
  const pageStages = [{ $sort: { _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, ...after.flatMap(join => joinStages(join, organization)), { $unset: "_department_region" }];
  let items: any[], total: number;
  if (search || before.length || section.base) {
    const [result] = await section.model.aggregate([...base, { $facet: { items: pageStages, count: [{ $count: "total" }] } }]);
    items = result?.items || []; total = result?.count[0]?.total || 0;
  } else {
    [items, total] = await Promise.all([section.model.aggregate([...base, ...pageStages]), sectionCount(section, organization)]);
  }
  return { data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, status: 200 };
}

export async function organizationOverview(req: NextRequest, kind: string) {
  try {
    const config = overviews[kind];
    const params = req.nextUrl.searchParams;
    const id = params.get(config.id);
    const mode = params.get("mode") || "summary", section = params.get("section") || "";
    const pageText = params.get("page") || "1", limitText = params.get("limit") || "25";
    const page = Number(pageText), limit = Number(limitText), search = (params.get("search") || "").trim();
    if (!id || !/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "A valid organization ID is required" }, { status: 400 });
    if (!["summary", "section"].includes(mode) || (mode === "section" && !Object.hasOwn(config.sections, section)) ||
      !/^\d+$/.test(pageText) || !/^\d+$/.test(limitText) || !Number.isSafeInteger(page) || page < 1 || page > 100000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || search.length > 100) {
      return NextResponse.json({ error: "Invalid section, pagination or search (limit 1–100, search at most 100 characters)" }, { status: 400 });
    }
    await connectDB();
    const denied = await authorizeOrganizationRead(req);
    if (denied) return denied;
    const organization: any = await config.model.findOne({ _id: id, status: 1 }).lean();
    if (!organization) return NextResponse.json({ error: "Organization not found or inactive" }, { status: 404 });
    const requiredParent = kind === "region-department" ? "region_id" : kind === "area-department" ? "area_id" : kind === "location-department" ? "location_id" : null;
    if (requiredParent && !organization[requiredParent]) return NextResponse.json({ error: "Organization parent assignment is missing" }, { status: 409 });
    // Some legacy geographic records have only a region or area reference.
    if (!organization.business_id) {
      const area: any = !organization.region_id && organization.area_id ? await Areas.findById(organization.area_id).select("region_id").lean() : null;
      const regionId = organization.region_id || area?.region_id;
      const region: any = regionId ? await Regions.findById(regionId).select("business_id").lean() : null;
      if (region?.business_id) organization.business_id = region.business_id;
    }
    if (mode === "section" && !organization.business_id && (["available_regions", "available_areas"].includes(section) ||
      section === "available_staffs" && ["region", "area", "location", "department"].includes(kind))) {
      return NextResponse.json({ error: "Organization business assignment is missing" }, { status: 409 });
    }
    const result = mode === "summary" ? { data: { organization, counts: Object.fromEntries(await Promise.all(
      Object.entries(config.sections).filter(([, definition]) => definition.summary !== false)
        .map(async ([key, definition]) => [key, await sectionCount(definition, organization)]),
    )) }, status: 200 } : await sectionPage(config.sections[section], organization, page, limit, search);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    console.error("Organization overview request failed");
    return NextResponse.json({ error: "Unable to load organization details" }, { status: 500 });
  }
}
