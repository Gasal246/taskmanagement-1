import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country_id = searchParams.get("country_id");
    const search = searchParams.get("search")?.trim() || "";
    const pageParam = Number(searchParams.get("page"));
    const limitParam = Number(searchParams.get("limit"));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 15)
        : 15;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (country_id) query.country_id = country_id;

    if (search) {
      const regex = new RegExp(search, "i");
      const countries = await Eq_countries.find({ country_name: regex })
        .select("_id")
        .lean();

      const orConditions: any[] = [{ region_name: regex }];

      if (countries.length) {
        orConditions.push({
          country_id: { $in: countries.map((c) => c._id) },
        });
      }

      query.$or = orConditions;
    }

    const totalRecords = await Eq_region.countDocuments(query);
    const regions = await Eq_region.find(query)
      .populate("country_id")
      .sort({ region_name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        regions,
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
    console.log("Error while getting regions filtered: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
