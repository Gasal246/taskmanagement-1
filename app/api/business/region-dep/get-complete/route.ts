import connectDB from "@/lib/mongo";
import Region_departments from "@/models/region_departments.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const region_dep_id = searchParams.get("region_dep_id");
        console.log("Region dep id: ", region_dep_id);
        if(!region_dep_id) {
            return NextResponse.json("Region department id is required", { status: 400 });
        }
        const data = await Region_departments.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(region_dep_id), status: 1 } },
            {
                $lookup: {
                    from: "region_dep_heads",
                    localField: "_id",
                    foreignField: "reg_dep_id",
                    as: "heads",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: "$user" }
                    ]
                }
            },
            {
                $lookup: {
                    from: "region_dep_staffs",
                    localField: "_id",
                    foreignField: "region_dep_id",
                    as: "staffs",
                    pipeline: [
                        { $match: { status: 1 } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                        { $unwind: "$user" }
                    ]
                }
            },
            // // todo: ALSO NEED TO FETCH THE PROJECTS WITH THIS DEPARTMENT == SALES DEP..
            {
                $lookup: {
                    from: "business_areas",
                    localField: "region_id",
                    foreignField: "region_id",
                    as: "areas"
                }
            },
            {
                $lookup: {
                    from: "area_departments",
                    let: { areaIds: "$areas._id", depType: "$type" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$area_id", "$$areaIds"] },
                                        { $eq: ["$status", 1] },
                                        { $eq: ["$type", "$$depType"] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "business_areas",
                                localField: "area_id",
                                foreignField: "_id",
                                as: "area"
                            }
                        },
                        { $unwind: { path: "$area", preserveNullAndEmptyArrays: true } }
                    ],
                    as: "area_departments"
                }
            },
            // { $unwind: "$area_departments" },
            // {
            //     $group: {
            //         _id: "$_id",
            //         type: { $first: "$type" },
            //         dep_name: { $first: "$dep_name" },
            //         region_id: { $first: "$region_id" },
            //         status: { $first: "$status" },
            //         sub_deps: { $addToSet: "$area_departments" },
            //         heads: { $addToSet: "$heads" },
            //         staffs: { $addToSet: "$staffs" }
            //     }
            // },
            // {
            //     $project: {
            //         _id: 1,
            //         type: 1,
            //         dep_name: 1,
            //         region_id: 1,
            //         status: 1,
            //         sub_deps: 1,
            //         heads: 1,
            //         staffs: 1
            //     }
            // }
        ]);
        console.log("Data: ", data);
        return NextResponse.json({ data: data[0], status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
