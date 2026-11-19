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
        const area_id = searchParams.get("area_id");

        const area = await Eq_area.findOne({ _id: area_id, ...scope.filter }).lean();

        return NextResponse.json({area, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting area by id: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}