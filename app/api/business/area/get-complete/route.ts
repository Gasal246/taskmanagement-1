import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const area_id = searchParams.get("area_id");
        if (!area_id) {
            return NextResponse.json({ error: "Area ID is required" }, { status: 400 });
        }
        const data = await Business_areas.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(area_id), status: 1 } },
            {
                $lookup: {
                    from: "area_heads",
                    localField: "_id",
                    foreignField: "area_id",
                    as: "heads",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "area_staffs",
                    localField: "_id",
                    foreignField: "area_id",
                    as: "staffs",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "staff_id", foreignField: "_id", as: "user" } },
                        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "business_locations",
                    localField: "_id",
                    foreignField: "area_id",
                    as: "locations",
                    pipeline: [
                        { $match: { status: 1 } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "area_departments",
                    localField: "_id",
                    foreignField: "area_id",
                    as: "departments",
                    pipeline: [
                        { $match: { status: 1 } }
                    ]
                }
            }
        ]);
        return NextResponse.json({ data: data[0], status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
