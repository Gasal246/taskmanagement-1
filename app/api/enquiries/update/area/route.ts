import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    area_id: string,
    area_name?: string,
    country?: string,
    region?: string,
    province?: string,
    city?: string
}

export async function PUT(req:NextRequest){
    try{
        const body:IBody = await req.json();
        if(!body.area_id) return NextResponse.json({message: "Please pass area_id", status: 400}, {status: 400})
        
        const updatePayload: Record<string, any> = { is_active: true };

        if (body.area_name !== undefined) updatePayload.area_name = body.area_name;
        if (body.country) updatePayload.country_id = body.country;
        if (body.region) updatePayload.region_id = body.region;
        if (body.province) updatePayload.province_id = body.province;
        if (body.city) updatePayload.city_id = body.city;

        await Eq_area.findByIdAndUpdate(body.area_id, { $set: updatePayload });
        return NextResponse.json({message: "Area Updated Successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while updating the Area: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
