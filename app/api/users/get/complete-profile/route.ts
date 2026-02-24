import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Business_skills from "@/models/business_skills.model";
import Business_departments from "@/models/business_departments.model";
import Department_regions from "@/models/department_regions.model";
import Department_areas from "@/models/department_areas.model";
import Dep_staffs from "@/models/department_staffs.model";
import Region_departments from "@/models/region_departments.model";
import Area_departments from "@/models/area_departments.model";
import Location_departments from "@/models/location_departments.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import "@/models/region_departments.model";
import "@/models/area_departments.model";
import "@/models/location_departments.model";
import Roles from "@/models/roles.model";
import User_areas from "@/models/user_areas.model";
import User_details from "@/models/user_details.model";
import User_docs from "@/models/user_docs.model";
import User_locations from "@/models/user_locations.model";
import User_regions from "@/models/user_regions.model";
import User_roles from "@/models/user_roles.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const userid = searchParams.get("userid");
        const status = searchParams.get("status");
        if (!userid) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const user = await Users.findById(userid, { password: 0, otp: 0 });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user_details = await User_details.findOne({ user_id: userid });

        await Roles.findOne({}).limit(1); // Refreshing business roles
        const user_roles = await User_roles.find({ user_id: userid, status: status || 1 }).populate({
            path: 'role_id',
            select: { role_name: 1, role_number: 1 }
        });

        await Business_regions.findOne({}).limit(1); // Refreshing business regions
        const user_regions = await User_regions.find({ user_id: userid, status: status || 1 }).populate({
            path: "region_id",
            select: { region_name: 1 }
        });

        await Business_areas.findOne({}).limit(1); // Refreshing business areas
        const user_areas = await User_areas.find({ user_id: userid, status: status || 1 }).populate({
            path: "area_id",
            select: { area_name: 1 }
        });

        await Business_skills.findOne({}).limit(1); // Refreshing business skills
        const user_skills = await User_skills.find({ user_id: userid, status: status || 1 }).populate({
            path: "skill_id",
            select: { skill_name: 1 }
        });

        await Business_locations.findOne({}).limit(1); // Refreshing business locations
        const user_locations = await User_locations.find({ user_id: userid, status: status || 1 }).populate({
            path: "location_id",
            select: { location_name: 1 }
        });

        const docQuery: any = { user_id: userid };
        if (status) docQuery.status = status;
        const user_docs = await User_docs.find(docQuery);

        const depStatus = status || 1;
        const populateRegionDept = {
            path: "reg_dep_id",
            model: "region_departments",
            select: { dep_name: 1, type: 1, region_id: 1 },
            populate: { path: "region_id", select: { region_name: 1 } }
        };
        const populateRegionDeptStaff = {
            path: "region_dep_id",
            model: "region_departments",
            select: { dep_name: 1, type: 1, region_id: 1 },
            populate: { path: "region_id", select: { region_name: 1 } }
        };
        const populateAreaDept = {
            path: "area_dep_id",
            model: "area_departments",
            select: { dep_name: 1, type: 1, region_id: 1, area_id: 1 },
            populate: [
                { path: "region_id", select: { region_name: 1 } },
                { path: "area_id", select: { area_name: 1 } }
            ]
        };
        const populateLocationDept = {
            path: "location_dep_id",
            model: "location_departments",
            select: { dep_name: 1, type: 1, region_id: 1, area_id: 1, location_id: 1 },
            populate: [
                { path: "region_id", select: { region_name: 1 } },
                { path: "area_id", select: { area_name: 1 } },
                { path: "location_id", select: { location_name: 1 } }
            ]
        };

        const [
            regionDepHeads,
            regionDepStaffs,
            areaDepHeads,
            areaDepStaffs,
            locationDepHeads,
            locationDepStaffs
        ] = await Promise.all([
            Region_dep_heads.find({ user_id: userid, status: depStatus }).populate(populateRegionDept).lean(),
            Region_dep_staffs.find({ user_id: userid, status: depStatus }).populate(populateRegionDeptStaff).lean(),
            Area_dep_heads.find({ user_id: userid, status: depStatus }).populate(populateAreaDept).lean(),
            Area_dep_staffs.find({ user_id: userid, status: depStatus }).populate(populateAreaDept).lean(),
            Location_dep_heads.find({ user_id: userid, status: depStatus }).populate(populateLocationDept).lean(),
            Location_dep_staffs.find({ user_id: userid, status: depStatus }).populate(populateLocationDept).lean(),
        ]);

        const depStaffs = await Dep_staffs.find({ staff_id: userid, status: depStatus }).lean();
        const depIds = depStaffs.map((dep) => dep?.dep_id).filter(Boolean);
        const [
            businessDeps,
            regionDeps,
            areaDeps,
            locationDeps,
            depRegions,
            depAreas
        ] = depIds.length > 0
            ? await Promise.all([
                Business_departments.find({ _id: { $in: depIds } }).select({ dep_name: 1 }).lean(),
                Region_departments.find({ _id: { $in: depIds } })
                    .select({ dep_name: 1, type: 1, region_id: 1 })
                    .populate({ path: "region_id", select: { region_name: 1 } })
                    .lean(),
                Area_departments.find({ _id: { $in: depIds } })
                    .select({ dep_name: 1, type: 1, region_id: 1, area_id: 1 })
                    .populate({ path: "region_id", select: { region_name: 1 } })
                    .populate({ path: "area_id", select: { area_name: 1 } })
                    .lean(),
                Location_departments.find({ _id: { $in: depIds } })
                    .select({ dep_name: 1, type: 1, region_id: 1, area_id: 1, location_id: 1 })
                    .populate({ path: "region_id", select: { region_name: 1 } })
                    .populate({ path: "area_id", select: { area_name: 1 } })
                    .populate({ path: "location_id", select: { location_name: 1 } })
                    .lean(),
                Department_regions.find({ department_id: { $in: depIds }, status: depStatus })
                    .populate({ path: "business_region_id", select: { region_name: 1 } })
                    .lean(),
                Department_areas.find({ dep_id: { $in: depIds }, status: depStatus })
                    .populate({ path: "area_id", select: { area_name: 1 } })
                    .populate({ path: "dep_region_id", select: { business_region_id: 1 } })
                    .lean(),
            ])
            : [[], [], [], [], [], []];

        const businessDepMap = new Map(businessDeps.map((dep: any) => [dep?._id?.toString?.(), dep]));
        const regionDepMap = new Map(regionDeps.map((dep: any) => [dep?._id?.toString?.(), dep]));
        const areaDepMap = new Map(areaDeps.map((dep: any) => [dep?._id?.toString?.(), dep]));
        const locationDepMap = new Map(locationDeps.map((dep: any) => [dep?._id?.toString?.(), dep]));
        const depRegionMap = new Map(depRegions.map((dep: any) => [dep?.department_id?.toString?.(), dep]));
        const depAreaMap = new Map(depAreas.map((dep: any) => [dep?.dep_id?.toString?.(), dep]));

        const mapDepartment = (
            entry: any,
            depKey: string,
            scope: string,
            role: string,
            assignmentModel: string
        ) => {
            const dep = entry?.[depKey];
            if (!dep) return null;
            return {
                _id: entry?._id,
                scope,
                role,
                assignment_model: assignmentModel,
                department: {
                    _id: dep?._id,
                    dep_name: dep?.dep_name,
                    type: dep?.type,
                },
                region: dep?.region_id
                    ? { _id: dep?.region_id?._id, region_name: dep?.region_id?.region_name }
                    : null,
                area: dep?.area_id
                    ? { _id: dep?.area_id?._id, area_name: dep?.area_id?.area_name }
                    : null,
                location: dep?.location_id
                    ? { _id: dep?.location_id?._id, location_name: dep?.location_id?.location_name }
                    : null,
            };
        };

        const user_departments = [
            ...regionDepHeads.map((entry: any) => mapDepartment(entry, "reg_dep_id", "region", "head", "region_dep_heads")),
            ...regionDepStaffs.map((entry: any) => mapDepartment(entry, "region_dep_id", "region", "staff", "region_dep_staffs")),
            ...areaDepHeads.map((entry: any) => mapDepartment(entry, "area_dep_id", "area", "head", "area_dep_heads")),
            ...areaDepStaffs.map((entry: any) => mapDepartment(entry, "area_dep_id", "area", "staff", "area_dep_staffs")),
            ...locationDepHeads.map((entry: any) => mapDepartment(entry, "location_dep_id", "location", "head", "location_dep_heads")),
            ...locationDepStaffs.map((entry: any) => mapDepartment(entry, "location_dep_id", "location", "staff", "location_dep_staffs")),
            ...depStaffs.map((entry: any) => {
                const depId = entry?.dep_id?.toString?.();
                if (!depId) return null;
                if (regionDepMap.has(depId)) {
                    const dep = regionDepMap.get(depId);
                    return {
                        _id: entry?._id,
                        scope: "region",
                        role: "staff",
                        assignment_model: "dep_staffs",
                        department: { _id: dep?._id, dep_name: dep?.dep_name, type: dep?.type },
                        region: dep?.region_id ? { _id: dep?.region_id?._id, region_name: dep?.region_id?.region_name } : null,
                        area: null,
                        location: null,
                    };
                }
                if (areaDepMap.has(depId)) {
                    const dep = areaDepMap.get(depId);
                    return {
                        _id: entry?._id,
                        scope: "area",
                        role: "staff",
                        assignment_model: "dep_staffs",
                        department: { _id: dep?._id, dep_name: dep?.dep_name, type: dep?.type },
                        region: dep?.region_id ? { _id: dep?.region_id?._id, region_name: dep?.region_id?.region_name } : null,
                        area: dep?.area_id ? { _id: dep?.area_id?._id, area_name: dep?.area_id?.area_name } : null,
                        location: null,
                    };
                }
                if (locationDepMap.has(depId)) {
                    const dep = locationDepMap.get(depId);
                    return {
                        _id: entry?._id,
                        scope: "location",
                        role: "staff",
                        assignment_model: "dep_staffs",
                        department: { _id: dep?._id, dep_name: dep?.dep_name, type: dep?.type },
                        region: dep?.region_id ? { _id: dep?.region_id?._id, region_name: dep?.region_id?.region_name } : null,
                        area: dep?.area_id ? { _id: dep?.area_id?._id, area_name: dep?.area_id?.area_name } : null,
                        location: dep?.location_id ? { _id: dep?.location_id?._id, location_name: dep?.location_id?.location_name } : null,
                    };
                }
                const dep = businessDepMap.get(depId);
                const depRegion = depRegionMap.get(depId);
                const depArea = depAreaMap.get(depId);
                return {
                    _id: entry?._id,
                    scope: depRegion ? "region" : depArea ? "area" : "business",
                    role: "staff",
                    assignment_model: "dep_staffs",
                    department: { _id: dep?._id, dep_name: dep?.dep_name },
                    region: depRegion?.business_region_id
                        ? { _id: depRegion?.business_region_id?._id, region_name: depRegion?.business_region_id?.region_name }
                        : null,
                    area: depArea?.area_id
                        ? { _id: depArea?.area_id?._id, area_name: depArea?.area_id?.area_name }
                        : null,
                    location: null,
                };
            }),
        ].filter(Boolean);

        return NextResponse.json({ user, user_details, user_roles, user_regions, user_areas, user_skills, user_docs, user_locations, user_departments, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
