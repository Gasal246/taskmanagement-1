import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Location_departments from "@/models/location_departments.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const dep_id = searchParams.get("area_dep_id");

        if(!dep_id){
            return NextResponse.json({ error: "Area Department ID is required" }, { status: 400 });
        }

        const dep_data = await Area_departments.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(dep_id), status: 1 } },
            {
                $lookup: {
                    from: "area_dep_heads",
                    localField: "_id",
                    foreignField: "area_dep_id",
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
                    from: "area_dep_staffs",
                    localField: "_id",
                    foreignField: "area_dep_id",
                    as: "staffs",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ]);

        const sub_deps = await Location_departments.find({ area_id: dep_data[0]?.area_id, type: dep_data[0]?.type });

        return NextResponse.json({ data: {
            staffs: dep_data[0]?.staffs,
            heads: dep_data[0]?.heads,
            subdeps: sub_deps || []
        }, status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
