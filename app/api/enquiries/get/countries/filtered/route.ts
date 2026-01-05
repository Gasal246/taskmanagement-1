import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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

    if (search) {
      query.country_name = new RegExp(search, "i");
    }

    const totalRecords = await Eq_countries.countDocuments(query);
    const countries = await Eq_countries.find(query)
      .sort({ country_name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        countries,
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
    console.log("Error while getting countries filtered: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
