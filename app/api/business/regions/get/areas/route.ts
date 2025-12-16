import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_regions from "@/models/business_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const region_ids = searchParams.get("region_ids");
        let regionIds = region_ids?.split(",");

        const regions = await Business_regions.find({ _id: { $in: regionIds }});

        const invalidRegionIds = regions?.filter((region) => region.status === 0)?.map((region) => region._id.toString()); // regions having status === 0 
        regionIds = regionIds?.filter((regionId) => !invalidRegionIds?.includes(regionId));

        const areas = await Business_areas.find({ region_id: { $in: regionIds }, status: 1 });
        return NextResponse.json({ data: areas, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
