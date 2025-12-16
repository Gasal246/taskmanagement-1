import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);

        const country_id = searchParams.get("country_id");
        const region_id = searchParams.get("region_id");
        const province_id = searchParams.get("province_id");
        const city_id = searchParams.get("city_id");

        const query:any = {};

        if(country_id) query.country_id = country_id;
        if(region_id) query.region_id = region_id;
        if(province_id) query.province_id = province_id;
        if(city_id) query.city_id = city_id;

        query.is_active = true;

        const areas = await Eq_area.find(query).populate("country_id").populate("region_id").populate("province_id").populate("city_id").exec();
        console.log("Eq areas: ", areas);
        return NextResponse.json({areas, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting areas filtered: ", err);
        return NextResponse.json({message:"Internal server error", status: 500}, {status: 500});
    }
}