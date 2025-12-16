import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Business_skills from "@/models/business_skills.model";
import Roles from "@/models/roles.model";
import User_areas from "@/models/user_areas.model";
import User_details from "@/models/user_details.model";
import User_docs from "@/models/user_docs.model";
import User_locations from "@/models/user_locations.model";
import User_regions from "@/models/user_regions.model";
import User_roles from "@/models/user_roles.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const userid = searchParams.get("userid");
        const status = searchParams.get("status");
        if (!userid) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const user = await Users.findById(userid, { password: 0, otp: 0 });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user_details = await User_details.findOne({ user_id: userid });

        await Roles.findOne({}).limit(1); // Refreshing business roles
        const user_roles = await User_roles.find({ user_id: userid, status: status || 1 }).populate({
            path: 'role_id',
            select: { role_name: 1, role_number: 1 }
        });

        await Business_regions.findOne({}).limit(1); // Refreshing business regions
        const user_regions = await User_regions.find({ user_id: userid, status: status || 1 }).populate({
            path: "region_id",
            select: { region_name: 1 }
        });

        await Business_areas.findOne({}).limit(1); // Refreshing business areas
        const user_areas = await User_areas.find({ user_id: userid, status: status || 1 }).populate({
            path: "area_id",
            select: { area_name: 1 }
        });

        await Business_skills.findOne({}).limit(1); // Refreshing business skills
        const user_skills = await User_skills.find({ user_id: userid, status: status || 1 }).populate({
            path: "skill_id",
            select: { skill_name: 1 }
        });

        await Business_locations.findOne({}).limit(1); // Refreshing business locations
        const user_locations = await User_locations.find({ user_id: userid, status: status || 1 }).populate({
            path: "location_id",
            select: { location_name: 1 }
        });

        const docQuery: any = { user_id: userid };
        if (status) docQuery.status = status;
        const user_docs = await User_docs.find(docQuery);

        return NextResponse.json({ user, user_details, user_roles, user_regions, user_areas, user_skills, user_docs, user_locations, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
