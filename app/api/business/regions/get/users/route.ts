import connectDB from "@/lib/mongo";
import User_regions from "@/models/user_regions.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const region_ids = searchParams.get("region_ids");
        let regionIds = region_ids?.split(",");

        await Users.findOne({}).limit(1); // REFRESHING USERS FOR POPULATING
        const region_users = await User_regions.find({ region_id: { $in: regionIds }, status: 1 })
            .populate({
                path: "user_id",
                select: { password: 0, otp: 0 }
            });
        return NextResponse.json({ data: region_users, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
