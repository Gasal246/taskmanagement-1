import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const business_id = searchParams.get("domain_id");
        const business = await Business.findById(business_id);
        if(business) return NextResponse.json({data:business, status:200}, {status:200});
        return NextResponse.json({message:"Not Found", status:404}, {status:404});
    }catch(err){
        console.log("Error while getting business by staff: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status:500});
    }
}