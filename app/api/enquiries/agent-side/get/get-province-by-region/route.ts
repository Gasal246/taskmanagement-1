import connectDB from "@/lib/mongo";
import Eq_province from "@/models/eq_province.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const region_id = searchParams.get("region_id");

        const provinces = await Eq_province.find({region_id: region_id}).lean();

        return NextResponse.json({provinces, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting province: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}