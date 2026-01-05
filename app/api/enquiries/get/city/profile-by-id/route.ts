import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_city from "@/models/eq_city.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city_id = searchParams.get("city_id");

    if (!city_id) {
      return NextResponse.json(
        { message: "Please pass city_id", status: 400 },
        { status: 400 }
      );
    }

    const city = await Eq_city.findById(city_id)
      .populate("country_id")
      .populate("region_id")
      .populate("province_id")
      .lean();
    if (!city) {
      return NextResponse.json(
        { message: "City not found", status: 404 },
        { status: 404 }
      );
    }

    const [areaCount, campCount, enquiryCount] = await Promise.all([
      Eq_area.countDocuments({ city_id }),
      Eq_camps.countDocuments({ city_id }),
      Eq_enquiry.countDocuments({ city_id }),
    ]);

    return NextResponse.json(
      {
        city,
        stats: {
          areas: areaCount,
          camps: campCount,
          enquiries: enquiryCount,
        },
        status: 200,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while getting city profile: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
