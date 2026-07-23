import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import "@/models/area_departments.model";
import "@/models/location_departments.model";
import '@/models/region_departments.model';
import { NextRequest, NextResponse } from "next/server";

connectDB();


export async function GET (req: NextRequest){
    try{
        const searchParams = req.nextUrl.searchParams;
        const business_id = searchParams.get("business_id");

        if(!business_id){
            return NextResponse.json({message: "Business ID is required"}, {status: 400});
        }
        
        const [region_departments, area_departments, location_departments] = await Promise.all([
            Business_regions.find({business_id: business_id, status: 1})
                .populate({path: "departments", match: {status: 1}})
                .lean(),
            Business_areas.find({business_id: business_id, status: 1})
                .populate({path: "departments", match: {status: 1}})
                .lean(),
            Business_locations.find({business_id: business_id, status: 1})
                .populate({path: "departments", match: {status: 1}})
                .lean(),
        ]);

        return NextResponse.json({region_departments, area_departments, location_departments}, {status: 200});
        

    } catch(err){
        console.log("Error while fetching business departments", err);
        return NextResponse.json({message: "Internal Server Error"}, {status: 500});
    }
}
