import connectDB from "@/lib/mongo";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_departments from "@/models/location_departments.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const location_dep_id = searchParams.get("location_dep_id");

        if(!location_dep_id){
            return NextResponse.json({ error: "Location Department ID is required" }, { status: 400 });
        }

        const dep_data = await Location_departments.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(location_dep_id), status: 1 } },
            {
                $lookup: {
                    from: "location_dep_heads",
                    localField: "_id",
                    foreignField: "location_dep_id",
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
                    from: "location_dep_staffs",
                    localField: "_id",
                    foreignField: "location_dep_id",
                    as: "staffs",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ]);

        return NextResponse.json({ data: {
            staffs: dep_data[0]?.staffs || [],
            heads: dep_data[0]?.heads || []
        }, status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
