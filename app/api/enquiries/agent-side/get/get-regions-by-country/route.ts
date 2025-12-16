import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const country_id = searchParams.get("country_id");
        
        if(!country_id) return NextResponse.json({message: "Please select country first", status: 400}, {status: 400});

        const region = await Eq_region.find({country_id: country_id}).lean();

        return NextResponse.json({region, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting region / territory: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}