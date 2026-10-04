import { authorizeOrganizationRead } from "@/lib/organization-access";
import connectDB from "@/lib/mongo";
import User_regions from "@/models/user_regions.model";
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

        const region_users = await User_regions.find({ region_id: { $in: regionIds }, status: 1 })
            .populate({
                path: "user_id",
                select: { password: 0, otp: 0 },
                match: { status: 1 }
            });
        const activeUsers = region_users.filter((entry: any) => entry?.user_id);
        return NextResponse.json({ data: activeUsers, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
