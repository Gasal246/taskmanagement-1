import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import Business_regions from "@/models/business_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const business_id = searchParams.get("business_id");

        console.log(business_id)

        const business = await Business.findById(business_id);
        if(!business){
            return NextResponse.json({ error: "Business Not Found" }, { status: 404 });
        }

        const regions = await Business_regions.find({ business_id: business_id, status: 1 });
        return NextResponse.json({ data: regions, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
