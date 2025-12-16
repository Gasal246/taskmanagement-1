import connectDB from "@/lib/mongo";
import Eq_city from "@/models/eq_city.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const province_id = searchParams.get("province_id");
        if(!province_id) return NextResponse.json({message:"Please select province", status: 400}, {status: 400});

        const cities = await Eq_city.find({province_id: province_id}).lean();

        return NextResponse.json({cities, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting city: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}