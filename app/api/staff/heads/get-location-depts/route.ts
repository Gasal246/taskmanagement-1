import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import Location_departments from "@/models/location_departments.model";
import { cp } from "fs";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const location_id = searchParams.get("location_id");
        if(!location_id) return NextResponse.json({message: "Location ID is required", status: 400}, {status: 400});
        const location_details = await Business_locations.findById(location_id);
        const departments = await Location_departments.find({location_id: location_id, status: 1});

        return NextResponse.json({message: "Departments fetched successfully", status: 200, data: {location_departments: departments, location: location_details}}, {status: 200});
    }catch(err){
        console.log("Error while getting departments for location: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}