import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ message: "Invalid user", status: 400 }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const pageParam = Number(searchParams.get("page"));
    const limitParam = Number(searchParams.get("limit"));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 15) : 15;
    const skip = (page - 1) * limit;

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    const query: any = {
      $or: [{ created_by: userObjectId }, { createdBy: userObjectId }],
    };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$and = [
        {
          $or: [
            { phone: regex },
            { address: regex },
            { geo_location: regex },
            { other_details: regex },
          ],
        },
      ];
    }

    const totalRecords = await Eq_camp_headoffice.countDocuments(query);

    const head_offices = await Eq_camp_headoffice.aggregate([
      { $match: query },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "eq_camps",
          localField: "_id",
          foreignField: "headoffice_id",
          as: "camps",
        },
      },
      {
        $project: {
          phone: 1,
          geo_location: 1,
          address: 1,
          other_details: 1,
          createdAt: 1,
          updatedAt: 1,
          camp_count: { $size: "$camps" },
          camps: {
            $map: {
              input: "$camps",
              as: "camp",
              in: { _id: "$$camp._id", camp_name: "$$camp.camp_name" },
            },
          },
        },
      },
    ]);

    return NextResponse.json(
      {
        head_offices,
        status: 200,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while getting staff head offices filtered:", err);
    return NextResponse.json({ message: "Internal server error", status: 500 }, { status: 500 });
  }
}
