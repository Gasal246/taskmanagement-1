import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const area_id = searchParams.get("area_id");
        if(!area_id) return NextResponse.json({message: "Please select area first", status: 400}, {status: 400});

        const camps = await Eq_camps.find({area_id: area_id, is_active: true}).lean();

        return NextResponse.json({camps, status: 200}, {status: 200});  
    }catch(err){
        console.log("Error while getting camps: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}