import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Location_departments from "@/models/location_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const area_id = searchParams.get("area_id");
        if(!area_id) return NextResponse.json({message: "Area ID is required", status: 400}, {status: 400});
        const area_details = await Business_areas.findById(area_id);
        const locations = await Business_locations.find({area_id: area_id, status: 1});
        const departments = await Area_departments.find({area_id: area_id, status: 1});

        return NextResponse.json({message: "Locations fetched successfully", status: 200, data: {locations, area_departments: departments, area: area_details}}, {status: 200});
    }catch(err){    
        console.log("Error while getting location details for heads: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}