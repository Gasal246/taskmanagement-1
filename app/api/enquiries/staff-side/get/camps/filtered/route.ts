import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_cities from "@/models/eq_city.model";
import Eq_countries from "@/models/eq_countries.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_province from "@/models/eq_province.model";
import Eq_region from "@/models/eq_region.model";
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

    const createdCampIds = await Eq_enquiry.distinct("camp_id", {
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      camp_id: { $ne: null },
    });

    if (!createdCampIds.length) {
      return NextResponse.json(
        {
          camps: [],
          status: 200,
          pagination: { page: 1, limit: 15, totalRecords: 0, totalPages: 0 },
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const country_id = searchParams.get("country_id");
    const region_id = searchParams.get("region_id");
    const province_id = searchParams.get("province_id");
    const city_id = searchParams.get("city_id");
    const area_id = searchParams.get("area_id");
    const search = searchParams.get("search")?.trim() || "";
    const pageParam = Number(searchParams.get("page"));
    const limitParam = Number(searchParams.get("limit"));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 15) : 15;
    const skip = (page - 1) * limit;

    const query: any = {
      is_active: true,
      _id: { $in: createdCampIds },
    };

    if (country_id) query.country_id = country_id;
    if (region_id) query.region_id = region_id;
    if (province_id) query.province_id = province_id;
    if (city_id) query.city_id = city_id;
    if (area_id) query.area_id = area_id;

    if (search) {
      const regex = new RegExp(search, "i");
      const [countries, regions, provinces, cities, areas] = await Promise.all([
        Eq_countries.find({ country_name: regex }).select("_id").lean(),
        Eq_region.find({ region_name: regex }).select("_id").lean(),
        Eq_province.find({ province_name: regex }).select("_id").lean(),
        Eq_cities.find({ city_name: regex }).select("_id").lean(),
        Eq_area.find({ area_name: regex }).select("_id").lean(),
      ]);

      const orConditions: any[] = [{ camp_name: regex }];

      if (countries.length) orConditions.push({ country_id: { $in: countries.map((c) => c._id) } });
      if (regions.length) orConditions.push({ region_id: { $in: regions.map((r) => r._id) } });
      if (provinces.length) orConditions.push({ province_id: { $in: provinces.map((p) => p._id) } });
      if (cities.length) orConditions.push({ city_id: { $in: cities.map((c) => c._id) } });
      if (areas.length) orConditions.push({ area_id: { $in: areas.map((a) => a._id) } });

      query.$or = orConditions;
    }

    const totalRecords = await Eq_camps.countDocuments(query);
    const camps = await Eq_camps.find(query)
      .populate("country_id")
      .populate("region_id")
      .populate("province_id")
      .populate("city_id")
      .populate("area_id")
      .skip(skip)
      .limit(limit)
      .exec();

    return NextResponse.json(
      {
        camps,
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
    console.log("Error while getting staff filtered camps:", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
