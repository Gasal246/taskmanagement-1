import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Region_departments from "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const region_id = searchParams.get("region_id");
        if(!region_id) return NextResponse.json({message: "Region ID is required", status: 400}, {status: 400});
        
        const areas = await Business_areas.find({region_id: region_id, status: 1});
        const region_departments = await Region_departments.find({region_id: region_id, status: 1});

        return NextResponse.json({message: "Areas fetched successfully", status: 200, data: {areas, region_departments}}, {status: 200});
    }catch(err){
        console.log("Error while getting the areas for Heads: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}