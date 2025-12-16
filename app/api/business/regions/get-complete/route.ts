import connectDB from "@/lib/mongo";
import Business_regions from "@/models/business_regions.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const region_id = searchParams.get("region_id");

        if(!region_id) {
            return NextResponse.json({ error: "Region ID not found" }, { status: 400 });
        }

        const regions = await Business_regions.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(region_id), status: 1 } },
            {
                $lookup: {
                    from: "business_areas",
                    localField: "_id",
                    foreignField: "region_id",
                    as: "areas",
                    pipeline: [
                        {
                            $match: { status: 1 }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "region_heads",
                    localField: "_id",
                    foreignField: "region_id",
                    as: "heads",
                    pipeline: [
                        {
                            $match: { status: 1 }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "user"
                            }
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "region_staffs",
                    localField: "_id",
                    foreignField: "region_id",
                    as: "staffs",
                    pipeline: [
                        {
                            $match: { status: 1 }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "staff_id",
                                foreignField: "_id",
                                as: "user"
                            }
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "region_departments",
                    localField: "_id",
                    foreignField: "region_id",
                    as: "departments",
                    pipeline: [
                        {
                            $match: { status: 1 }
                        }
                    ]
                }
            }
        ]);


        return NextResponse.json({ data: regions[0], status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
