import connectDB from "@/lib/mongo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import User_roles from "@/models/user_roles.model";
import Region_heads from "@/models/region_heads.model";
import Region_staffs from "@/models/region_staffs.model";
import Business_areas from "@/models/business_areas.model";
import Area_staffs from "@/models/area_staffs.model";
import Business_locations from "@/models/business_locations.model";
import Location_staffs from "@/models/location_staffs.model";
import Area_heads from "@/models/area_heads.model";
import Location_heads from "@/models/location_heads.model";
import "@/models/users.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_departments from "@/models/region_departments.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_departments from "@/models/area_departments.model";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_departments from "@/models/location_departments.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Department_heads from "@/models/department_heads.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status:401}, {status:401});

        const {searchParams} = new URL(req.url);
        const role_id = searchParams.get("role_id");

        const userRole = await User_roles.findOne({user_id:session?.user?.id, role_id: role_id}).populate("role_id", "role_name");
        if(!userRole) return NextResponse.json({message:"No role found for the user", status:401}, {status:401});
        console.log("user_role: ", userRole?.role_id?.role_name);
        
        switch(userRole?.role_id?.role_name){
            case "REGION_HEAD":
                const region = await Region_heads.find({user_id: session?.user?.id});
                const region_staffs = await Region_staffs.find({region_id: {$in: region.map((reg)=> reg?.region_id)}}).populate("staff_id").populate("region_id");
                const region_staff_with_role = region_staffs.map((staff)=>({
                    ...staff.toObject(),
                    role: "REGION_STAFF"
                }));

                const areas = await Business_areas.find({region_id: {$in: region.map((reg)=> reg?.region_id)}}).select("area_name");
                const area_heads = await Area_heads.find({area_id: {$in: areas.map((ar) => ar?._id)}}).populate("user_id").populate("area_id");
                const area_heads_with_role = area_heads.map((head)=>({
                    ...head.toObject(),
                    role: "AREA_HEAD"
                }));

                const area_staffs = await Area_staffs.find({area_id: {$in: areas.map((ar)=> ar?._id)}}).populate("staff_id").populate("area_id");
                const area_staffs_with_role = area_staffs.map((staff)=>({
                    ...staff.toObject(),
                    role:"AREA_STAFF"
                }));

                const locations = await Business_locations.find({region_id: {$in: region.map((reg)=> reg?.region_id)}});
                const location_heads = await Location_heads.find({location_id: {$in: locations.map((lc)=> lc?._id)}}).populate("user_id").populate("location_id");
                const location_heads_with_role = location_heads.map((head)=>({
                    ...head.toObject(),
                    role:"LOCATION_HEAD"
                }));

                const location_staffs = await Location_staffs.find({location_id: {$in: locations.map((lc)=> lc?._id)}}).populate("user_id").populate("location_id");
                const location_staffs_with_role = location_staffs.map((staff)=>({
                    ...staff.toObject(),
                    role:"LOCATION_STAFF"
                }));

                const headDepartments = await Region_departments.find({region_id: {$in: region.map((reg)=> reg?.region_id)}});

                const region_deparmentHeads = await Region_dep_heads.find({reg_dep_id: {$in: headDepartments?.map((dept)=> dept?._id)}}).populate("user_id").populate("reg_dep_id");
                const deptHeadsWithRoles = region_deparmentHeads?.map((head)=> ({
                    ...head.toObject(),
                    role: "REGION_DEP_HEAD"
                }));

                const region_departmentStaffs = await Region_dep_staffs.find({region_dep_id: {$in: headDepartments?.map((dept)=> dept?._id)}}).populate("user_id").populate("region_dep_id");
                const deptStaffsWithRoles = region_departmentStaffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "REGION_DEP_STAFF"
                }));
                
                const data = {
                    region_staffs: region_staff_with_role,
                    area_heads: area_heads_with_role,
                    area_staffs: area_staffs_with_role,
                    location_heads: location_heads_with_role,
                    location_staffs: location_staffs_with_role,
                    region_department_heads: deptHeadsWithRoles,
                    region_department_staffs: deptStaffsWithRoles
                };
                return NextResponse.json({data: data, status: 200}, {status:200});
                break;
            case "AREA_HEAD":
                const area = await Area_heads.find({user_id: session?.user?.id}).populate("user_id").populate("area_id");
                const area_users = await Area_staffs.find({area_id: {$in: area.map((ar)=> ar?.area_id)}}).populate("user_id").populate("area_id");
                const area_users_with_role = area_users.map((staff)=>({
                    ...staff.toObject(),
                    role: "AREA_STAFF"
                }));

                const area_location = await Business_locations.find({area_id: {$in: area.map((ar)=> ar?.area_id)}});

                const locationHeads = await Location_heads.find({location_id: {$in: area_location.map((ar)=> ar?._id)}}).populate("user_id").populate("location_id");
                const locationHeads_with_role = locationHeads.map((head)=> ({
                    ...head.toObject(),
                    role: "LOCATION_HEAD"
                }));

                const locationStaffs = await Location_staffs.find({location_id: {$in: area_location.map((loc)=> loc?._id)}}).populate("user_id").populate("location_id");
                const locationStaffs_with_role = locationStaffs.map((staff)=>({
                    ...staff.toObject(),
                    role:"LOCATION_STAFF"
                }));

                const area_departments = await Area_departments.find({area_id: {$in: area.map((ar)=> ar?.area_id)}});
                const area_depHeads = await Area_dep_heads.find({area_dep_id: {$in: area_departments?.map((dept)=> dept?._id)}}).populate("user_id").populate("area_dep_id");
                const area_depHeadsWithRole = area_depHeads?.map((head)=>({
                    ...head.toObject(),
                    role: 'AREA_DEP_HEAD'
                }));
                const area_depStaffs = await Area_dep_staffs.find({area_dep_id: {$in: area_departments?.map((dept)=> dept?._id)}}).populate("user_id").populate("area_dep_id");
                const area_deptStaffsWithRole = area_depStaffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "AREA_DEP_STAFF"
                }));

                const area_head_data = {
                    area_staffs: area_users_with_role,
                    location_heads: locationHeads_with_role,
                    location_staffs: locationStaffs_with_role,
                    area_department_heads: area_depHeadsWithRole,
                    area_departments_staffs: area_deptStaffsWithRole
                };
                return NextResponse.json({data: area_head_data, status: 200}, {status: 200});
                break;
            
            case "LOCATION_HEAD":
                const location_details = await Location_heads.find({user_id: session?.user?.id});
                const location_users = await Location_staffs.find({location_id: {$in: location_details.map((loc)=> loc?._id)}}).populate("user_id").populate("location_id");
                const locationUsers_with_role = location_users.map((staff)=> ({
                    ...staff.toObject(),
                    role: "LOCATION_STAFF"
                }));

                const location_deparmtent = await Location_departments.find({location_id: {$in: location_details?.map((loc)=> loc?.location_id)}});
                const location_depHeads = await Location_dep_heads.find({department_id: {$in: location_deparmtent?.map((loc)=> loc?._id)}});
                const location_depHeadsWithRole = location_depHeads?.map((head)=> ({
                    ...head.toObject(),
                    role: "LOCATION_DEP_HEAD"
                }));

                const location_depStaffs = await Location_dep_staffs.find({location_dep_id: {$in: location_deparmtent?.map((loc)=> loc?._id)}}).populate("user_id").populate("location_dep_id");
                const location_depStaffsWithRole = location_depStaffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "LOCATION_DEP_STAFF"
                }))

                const location_data = {
                    location_staffs: locationUsers_with_role,
                    location_department_heads: location_depHeadsWithRole,
                    location_department_staffs: location_depStaffsWithRole
                };

                return NextResponse.json({data: location_data, status: 200}, {status:200});
                break;
            case "REGION_DEP_HEAD":
                const departments = await Region_dep_heads.find({user_id: session?.user?.id});
                const reg_department_staffs = await Region_dep_staffs.find({department_id: {$in: departments?.map((dept)=> dept?._department_id)}}).populate("user_id").populate("region_dep_id");
                const reg_department_staffsWithRole = reg_department_staffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "REGION_DEP_STAFF"
                }));

                const region_dep_data = {
                    region_department_staffs: reg_department_staffsWithRole
                }

                return NextResponse.json({data: region_dep_data, status: 200}, {status: 200});
            case "AREA_DEP_HEAD":
                const area_dep = await Area_dep_heads.find({user_id: session?.user?.id});
                const area_department_staffs = await Area_dep_staffs.find({department_id: {$in: area_dep?.map((ar)=> ar?.area_id)}}).populate("user_id").populate("area_dep_id");
                const area_department_staffsWithRole = area_department_staffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "AREA_DEP_STAFF"
                }));

                const area_dep_data = {
                    area_department_staffs: area_department_staffsWithRole
                }

                return NextResponse.json({data: area_dep_data, status: 200}, {status:200});
            case "LOCATION_DEP_HEAD":
                const loc_dep = await Location_heads.find({user_id: session?.user?.id});
                const location_department_staffs = await Location_dep_heads.find({department_id: {$in: loc_dep?.map((loc)=> loc?.location_id)}}).populate("user_id").populate("location_dep_id");
                const location_department_staffsWithRole = location_department_staffs?.map((staff)=> ({
                    ...staff.toObject(),
                    role: "LOCATION_DEP_STAFF"
                }));

                const location_dep_data = {
                    location_department_staffs: location_department_staffsWithRole
                };

                return NextResponse.json({data: location_dep_data, status: 200}, {status:200});
        }
        return NextResponse.json({message:"Un-Authorized Access", status:401}, {status:401});
        
    }catch(err){
        console.log("Error while getting all staffs: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500});
    }
}