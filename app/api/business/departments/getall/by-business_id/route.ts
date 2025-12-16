import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_departments from "@/models/business_departments.model";
import Business_regions from "@/models/business_regions.model";
import Location_departments from "@/models/location_departments.model";
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
        
        const region_departments = await Business_regions.find({business_id: business_id}).populate("departments").lean();
        const area_departments = await Area_departments.find({business_id: business_id}).populate("departments").lean();
        const location_departments = await Location_departments.find({business_id: business_id}).populate("departments").lean();

        return NextResponse.json({region_departments, area_departments, location_departments}, {status: 200});
        

    } catch(err){
        console.log("Error while fetching business departments", err);
        return NextResponse.json({message: "Internal Server Error"}, {status: 500});
    }
}