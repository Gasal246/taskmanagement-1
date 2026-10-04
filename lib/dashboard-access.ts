import mongoose from "mongoose";
import Roles from "@/models/roles.model";
import UserRoles from "@/models/user_roles.model";
import Staff from "@/models/business_staffs.model";
import Admins from "@/models/admin_assign_business.model";
import Business from "@/models/business.model";
import Regions from "@/models/business_regions.model";
import Areas from "@/models/business_areas.model";
import Locations from "@/models/business_locations.model";
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

const scopes: Record<string, { resource: any; assignment: any; user: string; parent: string }> = {
  REGION_HEAD: { resource: Regions, assignment: RegionHeads, user: "user_id", parent: "region_id" },
  REGION_STAFF: { resource: Regions, assignment: RegionStaff, user: "staff_id", parent: "region_id" },
  AREA_HEAD: { resource: Areas, assignment: AreaHeads, user: "user_id", parent: "area_id" },
  AREA_STAFF: { resource: Areas, assignment: AreaStaff, user: "staff_id", parent: "area_id" },
  LOCATION_HEAD: { resource: Locations, assignment: LocationHeads, user: "user_id", parent: "location_id" },
  LOCATION_STAFF: { resource: Locations, assignment: LocationStaff, user: "user_id", parent: "location_id" },
  REGION_DEP_HEAD: { resource: RegionDepartments, assignment: RegionDepartmentHeads, user: "user_id", parent: "reg_dep_id" },
  REGION_DEP_STAFF: { resource: RegionDepartments, assignment: RegionDepartmentStaff, user: "user_id", parent: "region_dep_id" },
  AREA_DEP_HEAD: { resource: AreaDepartments, assignment: AreaDepartmentHeads, user: "user_id", parent: "area_dep_id" },
  AREA_DEP_STAFF: { resource: AreaDepartments, assignment: AreaDepartmentStaff, user: "user_id", parent: "area_dep_id" },
  LOCATION_DEP_HEAD: { resource: LocationDepartments, assignment: LocationDepartmentHeads, user: "user_id", parent: "location_dep_id" },
  LOCATION_DEP_STAFF: { resource: LocationDepartments, assignment: LocationDepartmentStaff, user: "user_id", parent: "location_dep_id" },
};

export class DashboardAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function resolveDashboardScope(userId: string, roleId: string | null, orgId: string | null, isSuper = false) {
  if (!mongoose.isValidObjectId(roleId) || !mongoose.isValidObjectId(orgId)) throw new DashboardAccessError(400, "Select a valid role and organization");
  const role: any = await Roles.findById(roleId).select("role_name").lean();
  const config = role && scopes[role.role_name];
  if (!config) throw new DashboardAccessError(400, "Select an organizational role");
  const resource: any = await config.resource.findOne({ _id: orgId, status: 1 }).lean();
  if (!resource) throw new DashboardAccessError(404, "Organization not found or inactive");
  let businessId = resource.business_id;
  if (!businessId && resource.region_id) {
    const region: any = await Regions.findOne({ _id: resource.region_id, status: 1 }).select("business_id").lean();
    businessId = region?.business_id;
  }
  if (!businessId) throw new DashboardAccessError(403, "Organization business assignment is missing");
  if (!await Business.exists({ _id: businessId, status: 1 })) throw new DashboardAccessError(403, "Organization business is inactive or missing");
  if (!isSuper) {
    const [heldRole, assignment, membership, admin] = await Promise.all([
      UserRoles.exists({ user_id: userId, role_id: roleId, status: 1, $or: [{ business_id: businessId }, { business_id: null }] }),
      config.assignment.exists({ [config.user]: userId, [config.parent]: orgId, status: 1 }),
      Staff.exists({ user_id: userId, business_id: businessId, status: 1 }),
      Admins.exists({ user_id: userId, business_id: businessId, status: 1 }),
    ]);
    if (!heldRole || !assignment || (!membership && !admin)) throw new DashboardAccessError(403, "You are not assigned to this role and organization");
  }
  return { roleName: String(role.role_name), businessId: String(businessId), resource };
}
