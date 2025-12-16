import connectDB from "@/lib/mongo";
import Business_clients from "@/models/business_clients.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const client_id = searchParams.get("client_id");
        if (!client_id) {
            return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
        }
        const client = await Business_clients.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(client_id), status: 1 }
            },
            {
                $lookup: {
                    from: "client_regions",
                    localField: "_id",
                    foreignField: "client_id",
                    as: "regions",
                    pipeline: [
                        { $match: { status: 1 } },
                        {
                            $lookup: {
                                from: "business_regions",
                                localField: "region_id",
                                foreignField: "_id",
                                as: "data"
                            }
                        },
                        {
                            $unwind: {
                                path: "$data",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ]
                },
            },
            {
                $lookup: {
                    from: "client_areas",
                    localField: "_id",
                    foreignField: "client_id",
                    as: "areas",
                    pipeline: [
                        { $match: { status: 1 } },
                        {
                            $lookup: {
                                from: "business_areas",
                                localField: "area_id",
                                foreignField: "_id",
                                as: "data"
                            }
                        },
                        {
                            $unwind: {
                                path: "$data",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "client_contacts",
                    localField: "_id",
                    foreignField: "client_id",
                    as: "contacts",
                    pipeline: [
                        { $match: { status: 1 } }
                    ]
                }
            },
            {
                $project: {
                    id: "$_id",
                    _id: 0,
                    client_name: 1,
                    category: 1,
                    industry: 1,
                    business_type: 1,
                    short_name: 1,
                    tax_number: 1,
                    company_address: 1,
                    billing_address: 1,
                    regions: 1,
                    areas: 1,
                    contacts: 1
                }
            }
        ]);

        return NextResponse.json({ data: client[0], status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export const dynamic = "force-dynamic";
