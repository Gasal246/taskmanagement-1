import AdminAssignBusiness from "@/models/admin_assign_business.model";
import AreaDepartments from "@/models/area_departments.model";
import AreaDepHeads from "@/models/area_dep_heads.model";
import AreaDepStaffs from "@/models/area_dep_staffs.model";
import LocationDepartments from "@/models/location_departments.model";
import LocationDepHeads from "@/models/location_dep_heads.model";
import LocationDepStaffs from "@/models/location_dep_staffs.model";
import RegionDepartments from "@/models/region_departments.model";
import RegionDepHeads from "@/models/region_dep_heads.model";
import RegionDepStaffs from "@/models/region_dep_staffs.model";
import { isValidObjectId } from "mongoose";

export type TodoStorageReason = "admin" | "sales-department" | "non-sales-staff";

type TodoCloudAccess = {
  allowed: boolean;
  reason: TodoStorageReason;
};

const idsFrom = (rows: any[], field: string) =>
  rows.map((row) => row?.[field]).filter(Boolean);

export async function resolveTodoCloudAccess(userId: string): Promise<TodoCloudAccess> {
  if (!userId || !isValidObjectId(userId)) {
    return { allowed: false, reason: "non-sales-staff" };
  }

  const adminAssignment = await AdminAssignBusiness.exists({ user_id: userId, status: 1 });
  if (adminAssignment) return { allowed: true, reason: "admin" };

  const [
    regionHeads,
    regionStaffs,
    areaHeads,
    areaStaffs,
    locationHeads,
    locationStaffs,
  ] = await Promise.all([
    RegionDepHeads.find({ user_id: userId, status: 1 }).select("reg_dep_id").lean(),
    RegionDepStaffs.find({ user_id: userId, status: 1 }).select("region_dep_id").lean(),
    AreaDepHeads.find({ user_id: userId, status: 1 }).select("area_dep_id").lean(),
    AreaDepStaffs.find({ user_id: userId, status: 1 }).select("area_dep_id").lean(),
    LocationDepHeads.find({ user_id: userId, status: 1 }).select("location_dep_id").lean(),
    LocationDepStaffs.find({ user_id: userId, status: 1 }).select("location_dep_id").lean(),
  ]);

  const regionDepartmentIds = [
    ...idsFrom(regionHeads, "reg_dep_id"),
    ...idsFrom(regionStaffs, "region_dep_id"),
  ];
  const areaDepartmentIds = [
    ...idsFrom(areaHeads, "area_dep_id"),
    ...idsFrom(areaStaffs, "area_dep_id"),
  ];
  const locationDepartmentIds = [
    ...idsFrom(locationHeads, "location_dep_id"),
    ...idsFrom(locationStaffs, "location_dep_id"),
  ];

  const [regionSales, areaSales, locationSales] = await Promise.all([
    regionDepartmentIds.length
      ? RegionDepartments.exists({ _id: { $in: regionDepartmentIds }, type: "sales", status: 1 })
      : null,
    areaDepartmentIds.length
      ? AreaDepartments.exists({ _id: { $in: areaDepartmentIds }, type: "sales", status: 1 })
      : null,
    locationDepartmentIds.length
      ? LocationDepartments.exists({ _id: { $in: locationDepartmentIds }, type: "sales", status: 1 })
      : null,
  ]);

  return regionSales || areaSales || locationSales
    ? { allowed: true, reason: "sales-department" }
    : { allowed: false, reason: "non-sales-staff" };
}
