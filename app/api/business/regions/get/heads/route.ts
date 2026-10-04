import { authorizeOrganizationRead } from "@/lib/organization-access";
import connectDB from "@/lib/mongo";
import "@/models/business_regions.model";
import Region_heads from "@/models/region_heads.model";
import "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET (req: NextRequest) {
    try {
        await connectDB();
        const denied = await authorizeOrganizationRead(req);
        if (denied) return denied;
        const { searchParams } = req.nextUrl;
        const region_ids = searchParams.get("region_ids");
        let regionIds = region_ids?.split(",");

        /* 
            Optimisation required:
            1. filter invalid business regions by status 0
            2. filter invalid users by status != 1
        */

        const heads = await Region_heads.find({ region_id: { $in: regionIds }, status: 1 })
            .populate({
                path: "user_id",
                select: { password: 0, otp: 0 },
                match: { status: 1 }
            });
        const activeHeads = heads.filter((head: any) => head?.user_id);
        return NextResponse.json({ data: activeHeads, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
