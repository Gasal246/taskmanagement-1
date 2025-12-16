import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";
import "@/models/eq_area.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const country_id = searchParams.get("country_id");
        const region_id = searchParams.get("region_id");
        const province_id = searchParams.get("province_id");
        const city_id = searchParams.get("city_id");
        const area_id = searchParams.get("area_id");

        const query:any = {};

        query.is_active = true;

        if(country_id) query.country_id = country_id;
        if(region_id) query.region_id = region_id;
        if(province_id) query.province_id = province_id;
        if(city_id) query.city_id = city_id;
        if(area_id) query.area_id = area_id;

        const camps = await Eq_camps.find(query).populate("country_id").populate("region_id").populate("province_id").populate("city_id").populate("area_id").exec();
        return NextResponse.json({camps, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting Filtered camps: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}