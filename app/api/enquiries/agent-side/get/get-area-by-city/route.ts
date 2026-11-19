import { enquiryLocationScope } from "@/lib/enquiries/location-scope";


import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const scope = await enquiryLocationScope(req);
        if (scope instanceof NextResponse) return scope;
        const {searchParams} = new URL(req.url);
        const city_id = searchParams.get("city_id");
        if(!city_id) return NextResponse.json({message: "Please select city first", status: 400}, {status: 400});

        const areas = await Eq_area.find({ ...scope.filter,city_id: city_id, is_active: true}).lean();

        return NextResponse.json({areas, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting the area: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}