import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Location_departments from "@/models/location_departments.model";
import Region_departments from "@/models/region_departments.model";
import Roles from "@/models/roles.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const {searchParams} = new URL(req.url);
        const user_id = session?.user?.id;
        const role_id = searchParams.get("role_id");
        const org_id = searchParams.get("org_id");

        const role = await Roles.findById(role_id);

        const userData = await Users.findById(user_id);

        const userSkills = await User_skills.find({user_id: user_id, status: 1}).populate("skill_id");
        const skills = userSkills?.map((skill)=> skill?.skill_id?.skill_name);

        const org_data:any = {};

        switch(role?.role_name){
            case "REGION_HEAD": {
                const region = await Business_regions.findById(org_id);
                const role = "REGION_HEAD";

                org_data.region = region;
                org_data.role = role;
                break;
            }
            case "REGION_DEP_HEAD": {
                const region_department = await Region_departments.findById(org_id).populate("region_id");
                
                org_data.department = region_department,
                org_data.region = region_department?.region_id;
                org_data.role = "REGION_DEP_HEAD";
                break;
            }
            case "REGION_STAFF": {
                const region = await Business_regions.findById(org_id);
                
                org_data.region = region;
                org_data.role = "REGION_STAFF";
                break;
            }
            case "REGION_DEP_STAFF": {
                const region_department = await Region_departments.findById(org_id).populate("region_id");
                
                org_data.department = region_department;
                org_data.region = region_department?.region_id;
                org_data.role = "REGION_DEP_STAFF";
                break;
            }
            case "AREA_HEAD": {
                const area = await Business_areas.findById(org_id).populate("region_id");

                org_data.area = area;
                org_data.region = area?.region_id;
                org_data.role = "AREA_HEAD";
                break;
            }
            case "AREA_DEP_HEAD": {
                const department = await Area_departments.findById(org_id).populate("area_id").populate("region_id");

                org_data.department = department;
                org_data.region = department?.region_id;
                org_data.area = department?.area_id;
                org_data.role = "AREA_DEP_HEAD";
                break;
            }
            case "AREA_STAFF": {
                const area = await Business_areas.findById(org_id).populate("region_id");

                org_data.area = area;
                org_data.region = area?.region_id;
                org_data.role = "AREA_STAFF";
                break;
            }
            case "AREA_DEP_STAFF": {
                const department = await Area_departments.findById(org_id).populate("area_id").populate("region_id");

                org_data.department = department;
                org_data.region = department?.region_id;
                org_data.area = department?.area_id;
                org_data.role = "AREA_DEP_STAFF";
                break;
            }
            case "LOCATION_HEAD": {
                const location = await Business_locations.findById(org_id).populate("area_id").populate("region_id");

                org_data.location = location;
                org_data.region = location?.region_id;
                org_data.area = location?.area_id;
                org_data.role = "LOCATION_HEAD";
                break;
            }
            case "LOCATION_DEP_HEAD": {
                const department = await Location_departments.findById(org_id).populate("location_id").populate("region_id").populate("area_id");

                org_data.department = department;
                org_data.region = department?.region_id;
                org_data.area = department?.area_id;
                org_data.location = department?.location_id;
                org_data.role = "LOCATION_DEP_HEAD";
                break;
            }
            case "LOCATION_STAFF": {
                const location = await Business_locations.findById(org_id).populate("area_id").populate("region_id");

                org_data.location = location;
                org_data.region = location?.region_id;
                org_data.area = location?.area_id;
                org_data.role = "LOCATION_STAFF";
                break;
            }
            case "LOCATION_DEP_STAFF": {
                const department = await Location_departments.findById(org_id).populate("location_id").populate("region_id").populate("area_id");

                org_data.department = department;
                org_data.region = department?.region_id;
                org_data.area = department?.area_id;
                org_data.location = department?.location_id;
                org_data.role = "LOCATION_DEP_STAFF";
                break;
            }
        }
        return NextResponse.json({userData, org_data, skills, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting Staff User Profile: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
