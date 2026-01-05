import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Area_heads from "@/models/area_heads.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Location_departments from "@/models/location_departments.model";
import Location_heads from "@/models/location_heads.model";
import Region_departments from "@/models/region_departments.model";
import Region_heads from "@/models/region_heads.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";
connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const session:any = await auth();
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status:401}, {status:401});

        const user_id = session?.user?.id;
        const role_id = searchParams.get("role_id");

        if(!user_id || !role_id){
            return NextResponse.json({message: "Invalid request parameters", status: 400}, {status: 400});
        }

        const user_role = await User_roles.findOne({role_id: role_id, user_id: user_id}).populate("role_id", "role_name");
        console.log("userRole: ", user_role);
        
        if(!user_role){
            return NextResponse.json({message: "User Role Not Found", status: 404}, {status: 404});
        }

        switch(user_role?.role_id?.role_name){
            case "REGION_HEAD":
                const region = await Region_heads.find({user_id: user_id, status: 1}).populate("region_id");
                const region_departments = await Region_departments.find({region_id: {$in: region.map((reg)=> reg?.region_id?._id)}});
                const areas = await Business_areas.find({region_id: {$in: region.map((reg)=> reg?.region_id?._id)}});
                const area_departments = await Area_departments.find({area_id: {$in: areas.map((ar)=> ar?._id)}});
                const locations = await Business_locations.find({area_id: {$in: areas.map((ar)=> ar?._id)}});
                const location_departments = await Location_departments.find({location_id: {$in: locations.map((loc)=> loc?._id)}});
                return NextResponse.json({message: "Region Head Departments fetched successfully", status: 200, data: {region_departments: region_departments, area_departments: area_departments, location_departments: location_departments}}, {status: 200});
                break;
            case "AREA_HEAD":
                const area = await Area_heads.find({user_id: user_id, status: 1}).populate("area_id");
                const area_deps = await Area_departments.find({area_id: {$in: area.map((ar)=> ar?.area_id?._id)}});
                const locs = await Business_locations.find({area_id: {$in: area.map((ar)=> ar?.area_id?._id)}});
                const loc_deps = await Location_departments.find({location_id: {$in: locs.map((loc)=> loc?._id)}});
                return NextResponse.json({message: "Area Head Departments fetched successfully", status: 200, data: {area_departments: area_deps, location_departments: loc_deps}}, {status: 200});
                break;
            case "LOCATION_HEAD":
                const location = await Location_heads.find({user_id: user_id, status: 1}).populate("location_id");
                const location_deps = await Location_departments.find({location_id: {$in: location.map((loc)=> loc?.location_id?._id)}});
                return NextResponse.json({message: "Location Head Departments fetched successfully", status: 200, data: {location_departments: location_deps}}, {status: 200});
                break;
            default:
                return NextResponse.json({message: "No departments found for this role", status: 200, data: {}}, {status: 200});
                break;
        }

    }catch(err){
        console.log("error while fetching departments: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}