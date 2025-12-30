import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_countries from "@/models/eq_countries.model";
import Eq_region from "@/models/eq_region.model";
import Eq_province from "@/models/eq_province.model";
import Eq_city from "@/models/eq_city.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);

        const country_id = searchParams.get("country_id");
        const region_id = searchParams.get("region_id");
        const province_id = searchParams.get("province_id");
        const city_id = searchParams.get("city_id");
        const search = searchParams.get("search")?.trim() || "";
        const pageParam = Number(searchParams.get("page"));
        const limitParam = Number(searchParams.get("limit"));
        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const limit =
          Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(limitParam, 15)
            : 15;
        const skip = (page - 1) * limit;

        const query:any = {};

        if(country_id) query.country_id = country_id;
        if(region_id) query.region_id = region_id;
        if(province_id) query.province_id = province_id;
        if(city_id) query.city_id = city_id;

        query.is_active = true;

        if (search) {
          const regex = new RegExp(search, "i");
          const [countries, regions, provinces, cities] = await Promise.all([
            Eq_countries.find({ country_name: regex }).select("_id").lean(),
            Eq_region.find({ region_name: regex }).select("_id").lean(),
            Eq_province.find({ province_name: regex }).select("_id").lean(),
            Eq_city.find({ city_name: regex }).select("_id").lean(),
          ]);

          const orConditions: any[] = [{ area_name: regex }];

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

          if (provinces.length) {
            orConditions.push({
              province_id: { $in: provinces.map((p) => p._id) },
            });
          }

          if (cities.length) {
            orConditions.push({
              city_id: { $in: cities.map((c) => c._id) },
            });
          }

          query.$or = orConditions;
        }

        const totalRecords = await Eq_area.countDocuments(query);
        const areas = await Eq_area.find(query)
          .populate("country_id")
          .populate("region_id")
          .populate("province_id")
          .populate("city_id")
          .skip(skip)
          .limit(limit)
          .exec();

        console.log("Eq areas: ", areas);
        return NextResponse.json(
          {
            areas,
            status: 200,
            pagination: {
              page,
              limit,
              totalRecords,
              totalPages: Math.ceil(totalRecords / limit),
            },
          },
          {status: 200}
        );
    }catch(err){
        console.log("Error while getting areas filtered: ", err);
        return NextResponse.json({message:"Internal server error", status: 500}, {status: 500});
    }
}
