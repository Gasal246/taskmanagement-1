import { enquiryLocationScope } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const scope = await enquiryLocationScope(req);
        if (scope instanceof NextResponse) return scope;
        const {searchParams} = new URL(req.url);
        const country_id = searchParams.get("country_id");
        
        if(!country_id) return NextResponse.json({message: "Please select country first", status: 400}, {status: 400});

        const region = await Eq_region.find({ ...scope.filter,country_id: country_id}).lean();

        return NextResponse.json({region, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting region / territory: ", err);
        return NextResponse.json({message: "Internal server error", status: 500}, {status: 500});
    }
}