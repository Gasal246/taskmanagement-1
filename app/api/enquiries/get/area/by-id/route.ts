import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const area_id = searchParams.get("area_id");

        const area = await Eq_area.findById(area_id).lean();

        return NextResponse.json({area, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting area by id: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}