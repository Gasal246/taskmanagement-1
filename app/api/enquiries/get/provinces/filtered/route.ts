import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import Eq_province from "@/models/eq_province.model";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country_id = searchParams.get("country_id");
    const region_id = searchParams.get("region_id");
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
    if (region_id) query.region_id = region_id;

    if (search) {
      const regex = new RegExp(search, "i");
      const [countries, regions] = await Promise.all([
        Eq_countries.find({ country_name: regex }).select("_id").lean(),
        Eq_region.find({ region_name: regex }).select("_id").lean(),
      ]);

      const orConditions: any[] = [{ province_name: regex }];

      if (countries.length) {
        orConditions.push({
          country_id: { $in: countries.map((c) => c._id) },
        });
      }

      if (regions.length) {
        orConditions.push({
          region_id: { $in: regions.map((r) => r._id) },
        });
      }

      query.$or = orConditions;
    }

    const totalRecords = await Eq_province.countDocuments(query);
    const provinces = await Eq_province.find(query)
      .populate("country_id")
      .populate("region_id")
      .sort({ province_name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        provinces,
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
    console.log("Error while getting provinces filtered: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
