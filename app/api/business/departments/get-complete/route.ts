import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_departments from "@/models/business_departments.model";
import Business_regions from "@/models/business_regions.model";
import Department_areas from "@/models/department_areas.model";
import Department_heads from "@/models/department_heads.model";
import Department_regions from "@/models/department_regions.model";
import Dep_staffs from "@/models/department_staffs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const dep_id = searchParams.get("dep_id");
        
        if (!dep_id) {
            return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
        }

        const department = await Business_departments.findOne({ _id: dep_id });

        await Business_regions.findOne({}).limit(1); // schema refresh
        const regions = await Department_regions.find({ department_id: dep_id, status: 1 })
            .populate({
                path: "business_region_id",
                select: { region_name: 1 }
            });

        await Business_areas.findOne({}).limit(1); // schema refresh
        const areas = await Department_areas.find({ dep_id: dep_id, status: 1 })
            .populate({
                path: "area_id",
                select: { area_name: 1, region_id: 1 }
            });
        
        const heads = await Department_heads.find({ dep_id: dep_id, status: 1 })
            .populate({
                path: "user_id",
                select: { name: 1, email: 1, avatar_url: 1 }
            });
        
        const staffs = await Dep_staffs.find({ dep_id: dep_id, status: 1 })
            .populate({
                path: "staff_id",
                select: { name: 1, email: 1, avatar_url: 1 }
            });
        return NextResponse.json({ data: {
            department,
            regions,
            areas,
            heads,
            staffs
        }, status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
