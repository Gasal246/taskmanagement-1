import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { canAdministerBusiness } from "@/lib/server-access";
import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import Regions from "@/models/business_regions.model";
import Areas from "@/models/business_areas.model";
import Locations from "@/models/business_locations.model";
import RegionDepartments from "@/models/region_departments.model";
import AreaDepartments from "@/models/area_departments.model";
import LocationDepartments from "@/models/location_departments.model";
import RegionStaff from "@/models/region_dep_staffs.model";
import AreaStaff from "@/models/area_dep_staffs.model";
import LocationStaff from "@/models/location_dep_staffs.model";
import RegionHeads from "@/models/region_dep_heads.model";
import AreaHeads from "@/models/area_dep_heads.model";
import LocationHeads from "@/models/location_dep_heads.model";
import BusinessStaff from "@/models/business_staffs.model";
import Tasks from "@/models/business_tasks.model";
import Activities from "@/models/task_activities.model";
import "@/models/users.model";
import type { AssignmentDepartment } from "@/types/task-assignment";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const params = req.nextUrl.searchParams;
    const businessId = params.get("business_id");
    const regionId = params.get("region_id");
    const areaId = params.get("area_id");
    const locationId = params.get("location_id");
    const departmentId = params.get("department_id");
    const kind = params.get("kind");
    const invalidId = [businessId, regionId, areaId, locationId, departmentId]
      .some(id => id !== null && !/^[a-f\d]{24}$/i.test(id));
    if (!businessId || invalidId || (areaId && !regionId) || (locationId && !areaId) ||
      (departmentId && (!regionId || !["region", "area", "location"].includes(kind || "")))) {
      return NextResponse.json({ message: "Choose a valid business, region and hierarchy" }, { status: 400 });
    }
    await connectDB();
    if (!session.user.is_super && !await canAdministerBusiness(session.user.id, businessId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const regions = await Regions.find({ business_id: businessId, status: 1 })
      .select("region_name").sort({ region_name: 1, _id: 1 }).lean();
    const region = regions.find((row: any) => String(row._id) === regionId);
    if (regionId && !region) return NextResponse.json({ message: "Region not found" }, { status: 404 });
    if (!region) return NextResponse.json({ data: { regions, areas: [], locations: [], departments: [] }, status: 200 });

    // Follow the stored parent IDs so legacy departments without region_id are included.
    const areas = await Areas.find({ region_id: region._id, status: 1 }).select("area_name").sort({ area_name: 1, _id: 1 }).lean();
    const area = areas.find((row: any) => String(row._id) === areaId);
    if (areaId && !area) return NextResponse.json({ message: "Area not found in this region" }, { status: 404 });
    const scopedAreaIds = area ? [area._id] : areas.map((row: any) => row._id);
    const locations = await Locations.find({ area_id: { $in: scopedAreaIds }, status: 1 })
      .select("location_name area_id").sort({ location_name: 1, _id: 1 }).lean();
    const location = locations.find((row: any) => String(row._id) === locationId);
    if (locationId && !location) return NextResponse.json({ message: "Location not found in this area" }, { status: 404 });
    const [regionDepartments, areaDepartments, locationDepartments] = await Promise.all([
      !area ? RegionDepartments.find({ region_id: region._id, status: 1 }).select("dep_name").lean() : [],
      !location ? AreaDepartments.find({ area_id: { $in: scopedAreaIds }, status: 1 }).select("dep_name area_id").lean() : [],
      LocationDepartments.find({ location_id: { $in: location ? [location._id] : locations.map((row: any) => row._id) }, status: 1 })
        .select("dep_name location_id").lean(),
    ]);
    const areaNames = new Map(areas.map((row: any) => [String(row._id), row.area_name]));
    const locationMap = new Map(locations.map((row: any) => [String(row._id), row]));
    const departments: AssignmentDepartment[] = [
      ...regionDepartments.map((row: any) => ({ _id: String(row._id), dep_name: row.dep_name, kind: "region" as const, scope: region.region_name })),
      ...areaDepartments.map((row: any) => ({ _id: String(row._id), dep_name: row.dep_name, kind: "area" as const,
        scope: `${region.region_name} > ${areaNames.get(String(row.area_id))}` })),
      ...locationDepartments.map((row: any) => {
        const parent = locationMap.get(String(row.location_id));
        return { _id: String(row._id), dep_name: row.dep_name, kind: "location" as const,
          scope: `${region.region_name} > ${areaNames.get(String(parent.area_id))} > ${parent.location_name}` };
      }),
    ].sort((a, b) => (a.dep_name || "").localeCompare(b.dep_name || "") || a.scope.localeCompare(b.scope));

    if (!departmentId) {
      return NextResponse.json({ data: { regions, areas, locations: area ? locations : [], departments }, status: 200 });
    }
    const department = departments.find(row => row._id === departmentId && row.kind === kind);
    if (!department) return NextResponse.json({ message: "Department not found in this selection" }, { status: 404 });
    const [staffModel, headModel, staffField, headField] = department.kind === "region"
      ? [RegionStaff, RegionHeads, "region_dep_id", "reg_dep_id"]
      : department.kind === "area" ? [AreaStaff, AreaHeads, "area_dep_id", "area_dep_id"]
        : [LocationStaff, LocationHeads, "location_dep_id", "location_dep_id"];
    const [staffIds, headIds] = await Promise.all([
      staffModel.find({ [staffField]: departmentId, status: 1 }).distinct("user_id"),
      headModel.find({ [headField]: departmentId, status: 1 }).distinct("user_id"),
    ]);
    const members = [...new Set([...staffIds, ...headIds].filter(Boolean).map(String))];
    const staffs = await BusinessStaff.find({ business_id: businessId, user_id: { $in: members }, status: 1 })
      .populate({ path: "user_id", select: "name email phone avatar_url", match: { status: 1 } }).lean();
    const activeStaffs = [...new Map(staffs.filter((row: any) => row.user_id)
      .map((row: any) => [String(row.user_id._id), row])).values()];
    const ids = activeStaffs.map((row: any) => row.user_id._id);
    const [taskCounts, activityCounts] = ids.length ? await Promise.all([
      Tasks.aggregate([{ $match: { assigned_to: { $in: ids } } }, { $group: { _id: "$assigned_to", count: { $sum: 1 } } }]),
      Activities.aggregate([{ $match: { assigned_to: { $in: ids } } }, { $group: { _id: "$assigned_to", count: { $sum: 1 } } }]),
    ]) : [[], []];
    const tasksByUser = new Map(taskCounts.map((row: any) => [String(row._id), row.count]));
    const activitiesByUser = new Map(activityCounts.map((row: any) => [String(row._id), row.count]));
    const data = activeStaffs.map((row: any) => ({ ...row, task_count: tasksByUser.get(String(row.user_id._id)) || 0,
      activity_count: activitiesByUser.get(String(row.user_id._id)) || 0 }))
      .sort((a, b) => (a.user_id.name || "").localeCompare(b.user_id.name || ""));
    return NextResponse.json({ data, status: 200 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    console.error("Unable to load task assignment options");
    return NextResponse.json({ message: "Unable to load task assignment options" }, { status: 500 });
  }
}
