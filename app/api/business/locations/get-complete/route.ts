import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const loc_id = searchParams.get("loc_id");

        if(!loc_id){
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }

        const data = await Business_locations.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(loc_id),
                    status: 1
                }
            },
            {
                $lookup: {
                    from: "location_heads",
                    localField: "_id",
                    foreignField: "location_id",
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
                    from: "location_staffs",
                    localField: "_id",
                    foreignField: "location_id",
                    as: "staffs",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "location_departments",
                    localField: "_id",
                    foreignField: "location_id",
                    as: "departments",
                    pipeline: [
                        { $match: { status: 1 } }
                    ]
                }
            }
        ]);

        return NextResponse.json({ data: data[0], status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json({ error: `Internal Server Error ${error.message}`, status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
