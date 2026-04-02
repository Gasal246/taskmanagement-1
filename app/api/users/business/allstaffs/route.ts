import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import Business_staffs from "@/models/business_staffs.model";
import User_areas from "@/models/user_areas.model";
import User_locations from "@/models/user_locations.model";
import User_regions from "@/models/user_regions.model";
import User_skills from "@/models/user_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = await req.nextUrl;
        const business_id = await searchParams.get("business_id");
        const region_id = await searchParams.get("region_id");
        const area_id = await searchParams.get("area_id");
        const location_id = await searchParams.get("location_id");
        const skill_id = await searchParams.get("skill_id");
        const search = (await searchParams.get("search"))?.trim();
        if (!business_id) {
            return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
        }
        
        await Business.findOne({}).limit(1); // JUST REFRESING THE SCHEMA FOR POPULATING IT
        const intersectSets = (current: Set<string> | null, next: Set<string>) => {
            if (!current) return next;
            const result = new Set<string>();
            for (const id of current) {
                if (next.has(id)) result.add(id);
            }
            return result;
        };
        const toUserIdSet = (docs: Array<{ user_id?: any }>) => {
            return new Set(
                docs
                    .map((doc) => doc?.user_id?.toString())
                    .filter((id): id is string => Boolean(id))
            );
        };

        let filterUserIds: Set<string> | null = null;
        const hasFilters = Boolean(region_id || area_id || location_id || skill_id);

        if (region_id) {
            const regionUsers = await User_regions.find({ region_id, status: 1 }).select("user_id").lean();
            filterUserIds = intersectSets(filterUserIds, toUserIdSet(regionUsers));
        }
        if (area_id) {
            const areaUsers = await User_areas.find({ area_id, status: 1 }).select("user_id").lean();
            filterUserIds = intersectSets(filterUserIds, toUserIdSet(areaUsers));
        }
        if (location_id) {
            const locationUsers = await User_locations.find({ location_id, status: 1 }).select("user_id").lean();
            filterUserIds = intersectSets(filterUserIds, toUserIdSet(locationUsers));
        }
        if (skill_id) {
            const skillUsers = await User_skills.find({ skill_id, status: 1 }).select("user_id").lean();
            filterUserIds = intersectSets(filterUserIds, toUserIdSet(skillUsers));
        }

        if (hasFilters && (!filterUserIds || filterUserIds.size === 0)) {
            return NextResponse.json([]);
        }

        const populateOptions: any = {
            path: "user_id",
            select: { password: 0, otp: 0 }
        };
        if (search) {
            const searchRegex = new RegExp(search, "i");
            populateOptions.match = {
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            };
        }
        const staffQuery: any = { business_id };
        if (filterUserIds && filterUserIds.size > 0) {
            staffQuery.user_id = { $in: Array.from(filterUserIds) };
        }
        const allStaffs = await Business_staffs.find(staffQuery)
            .populate(populateOptions)
            .sort({ updatedAt: -1 });
        const filteredStaffs = search ? allStaffs.filter((staff: any) => staff?.user_id) : allStaffs;
        return NextResponse.json(filteredStaffs);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
