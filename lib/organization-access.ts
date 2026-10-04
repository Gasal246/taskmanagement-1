import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Admins from "@/models/admin_assign_business.model";
import Staff from "@/models/business_staffs.model";
import Business from "@/models/business.model";
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
import DepartmentAreas from "@/models/department_areas.model";
import DepartmentRegions from "@/models/department_regions.model";
import Clients from "@/models/business_clients.model";
import ClientAreas from "@/models/client_areas.model";
import ClientRegions from "@/models/client_regions.model";
import ClientContacts from "@/models/client_contacts.model";
import Skills from "@/models/business_skills.model";
import UserRegions from "@/models/user_regions.model";
import UserAreas from "@/models/user_areas.model";
import UserLocations from "@/models/user_locations.model";
import UserSkills from "@/models/user_skills.model";

const resources: Record<string, any> = {
  business_id: Business, region_id: Regions, business_region_id: Regions, BRid: Regions,
  area_id: Areas, BAid: Areas, location_id: Locations, LocId: Locations,
  dep_id: Departments, department_id: Departments, BDepId: Departments,
  reg_dep_id: RegionDepartments, region_dep_id: RegionDepartments, RegDepId: RegionDepartments,
  area_dep_id: AreaDepartments, AreaDepId: AreaDepartments,
  location_dep_id: LocationDepartments, LocDepId: LocationDepartments,
  RHid: RegionHeads, RegStaffId: RegionStaff, AreaHId: AreaHeads, AreaStaffId: AreaStaff,
  LocHeadId: LocationHeads, LocStaffId: LocationStaff,
  head_id: RegionDepartmentHeads, RegDepHeadId: RegionDepartmentHeads, RegDepStaffId: RegionDepartmentStaff,
  AreaDepHeadId: AreaDepartmentHeads, AreaDepStaffId: AreaDepartmentStaff,
  LocationDepHeadId: LocationDepartmentHeads, LocationDepStaffId: LocationDepartmentStaff,
  DepHeadId: DepartmentHeads, DepStaffId: DepartmentStaff, DepAreaId: DepartmentAreas, DepRegId: DepartmentRegions, DepRegionId: DepartmentRegions,
  client_id: Clients, business_client_id: Clients, BClientId: Clients,
  BCAreaId: ClientAreas, BCRegId: ClientRegions, BCContactId: ClientContacts,
  skill_id: Skills, BSkillId: Skills,
  URegId: UserRegions, UAreaId: UserAreas, ULocId: UserLocations, USkillId: UserSkills,
};
const departmentAssignments: Record<string, any> = {
  region_dep_heads: RegionDepartmentHeads, region_dep_staffs: RegionDepartmentStaff,
  area_dep_heads: AreaDepartmentHeads, area_dep_staffs: AreaDepartmentStaff,
  location_dep_heads: LocationDepartmentHeads, location_dep_staffs: LocationDepartmentStaff,
  dep_staffs: DepartmentStaff,
};
const hierarchy: Record<string, any> = { region: Regions, area: Areas, location: Locations,
  region_department: RegionDepartments, area_department: AreaDepartments, location_department: LocationDepartments };
const parentFields = ["business_id", "region_id", "area_id", "location_id", "dep_id", "department_id", "reg_dep_id", "region_dep_id", "area_dep_id", "location_dep_id", "client_id", "business_client_id", "dep_region_id", "business_region_id"];

async function businessIdsFor(model: any, id: string, visited = new Set<string>()): Promise<string[]> {
  if (!mongoose.isValidObjectId(id)) return [];
  if (model.modelName === Business.modelName) return [id];
  const key = `${model.modelName}:${id}`;
  if (visited.has(key) || visited.size > 12) return [];
  visited.add(key);
  const row: any = await model.findById(id).select(parentFields.join(" ")).lean();
  if (!row) return [];
  if (row.business_id) return [String(row.business_id)];
  // Legacy department_staffs.dep_id points to several department collections.
  if (model.modelName === DepartmentStaff.modelName && row.dep_id) {
    const scopes = await Promise.all([Departments, RegionDepartments, AreaDepartments, LocationDepartments]
      .map(parent => businessIdsFor(parent, String(row.dep_id), new Set(visited))));
    return [...new Set(scopes.flat())];
  }
  for (const field of parentFields) {
    const ref = model.schema.path(field)?.options?.ref;
    const parent = typeof ref === "string" ? mongoose.models[ref] : null;
    if (row[field] && parent) {
      const ids = await businessIdsFor(parent, String(row[field]), visited);
      if (ids.length) return ids;
    }
  }
  return [];
}

// Legacy organization APIs accept several historical ID names. Resolve the
// stored resource's business, rather than trusting a supplied business hint.
export async function authorizeOrganizationMutation(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.is_super) return null;
  const owned = new Set((await Admins.find({ user_id: session.user.id, status: 1 }).distinct("business_id")).map(String));
  const forbidden = () => NextResponse.json({ message: "You cannot manage this business resource" }, { status: 403 });
  if (!owned.size) return forbidden();
  let body: any;
  try {
    const copy = req.clone();
    if (req.method === "DELETE" && !req.body) body = Object.fromEntries(new URL(req.url).searchParams);
    else if ((req.headers.get("content-type") || "").includes("application/json")) body = await copy.json();
    else {
      const form = await copy.formData();
      body = JSON.parse(String(form.get("body") || "{}"));
    }
  } catch { return NextResponse.json({ message: "Invalid request body" }, { status: 400 }); }
  let resolved = false;
  const scopeIds = new Set<string>();
  const path = new URL(req.url).pathname;
  for (const [field, defaultModel] of Object.entries(resources)) {
    if (!body[field]) continue;
    // These legacy forms call the selected area/location department "dep_id".
    // Resolve its collection from the server route, never from a client-supplied model name.
    const model = field === "dep_id" && path.startsWith("/api/business/area-dep/") ? AreaDepartments
      : field === "dep_id" && path.startsWith("/api/business/location-dep/") ? LocationDepartments : defaultModel;
    const businessIds = await businessIdsFor(model, String(body[field]));
    if (!businessIds.length || businessIds.some(id => !owned.has(id))) return forbidden();
    for (const id of businessIds) scopeIds.add(id);
    resolved = true;
  }
  if (body.entity_type && hierarchy[body.entity_type] && body.id) {
    const ids = await businessIdsFor(hierarchy[body.entity_type], String(body.id));
    if (!ids.length || ids.some(id => !owned.has(id))) return forbidden();
    ids.forEach(id => scopeIds.add(id));
    resolved = true;
  }
  if (body.assignmentId && departmentAssignments[body.assignmentModel]) {
    const ids = await businessIdsFor(departmentAssignments[body.assignmentModel], String(body.assignmentId));
    if (!ids.length || ids.some(id => !owned.has(id))) return forbidden();
    ids.forEach(id => scopeIds.add(id));
    resolved = true;
  }
  if (!resolved || scopeIds.size !== 1) return forbidden();
  if (body.user_id && !await Staff.exists({ user_id: body.user_id, business_id: { $in: [...scopeIds] }, status: 1 })) return forbidden();
  return null;
}

async function businessIdsForMany(model: any, ids: string[], depth = 0): Promise<string[]> {
  if (!ids.length || depth > 6) return [];
  if (model.modelName === Business.modelName) return ids;
  const rows: any[] = await model.find({ _id: { $in: ids } }).select(parentFields.join(" ")).lean();
  if (rows.length !== ids.length) return [];
  const resolved = new Set<string>();
  const unresolved = rows.filter(row => {
    if (!row.business_id) return true;
    resolved.add(String(row.business_id));
    return false;
  });
  for (const row of unresolved) if (!parentFields.some(field => row[field] && model.schema.path(field)?.options?.ref)) return [];
  for (const field of parentFields) {
    const ref = model.schema.path(field)?.options?.ref;
    const parent = typeof ref === "string" ? mongoose.models[ref] : null;
    const values = [...new Set(unresolved.map(row => row[field]).filter(Boolean).map(String))];
    if (!parent || !values.length) continue;
    const scope = await businessIdsForMany(parent, values, depth + 1);
    if (!scope.length) return [];
    scope.forEach(id => resolved.add(id));
  }
  return [...resolved];
}

export async function authorizeOrganizationRead(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.is_super) return null;
  const [adminIds, staffIds] = await Promise.all([
    Admins.find({ user_id: session.user.id, status: 1 }).distinct("business_id"),
    Staff.find({ user_id: session.user.id, status: 1 }).distinct("business_id"),
  ]);
  const allowed = new Set([...adminIds, ...staffIds].map(String));
  const forbidden = () => NextResponse.json({ message: "You cannot view this business resource" }, { status: 403 });
  if (!allowed.size) return forbidden();
  const params = new URL(req.url).searchParams;
  const readResources = { ...resources, domain_id: Business, loc_id: Locations, region_ids: Regions, area_ids: Areas };
  let resolved = false;
  for (const [field, model] of Object.entries(readResources)) {
    const value = params.get(field);
    if (!value) continue;
    const ids = [...new Set(value.split(",").map(id => id.trim()))];
    if (ids.length > 200 || ids.some(id => !mongoose.isValidObjectId(id))) return NextResponse.json({ message: "Provide up to 200 valid resource IDs" }, { status: 400 });
    const scope = await businessIdsForMany(model, ids);
    if (!scope.length || scope.some(id => !allowed.has(id))) return forbidden();
    resolved = true;
  }
  return resolved ? null : NextResponse.json({ message: "Provide a business resource ID" }, { status: 400 });
}
