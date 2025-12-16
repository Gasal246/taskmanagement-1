import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const area_ids = searchParams.get("area_ids");
        let areaIds = area_ids?.split(",");

        const locations = await Business_locations.find({ area_id: { $in: areaIds }, status: 1 });
        return NextResponse.json({ data: locations, status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
};

export const dynamic = "force-dynamic";

