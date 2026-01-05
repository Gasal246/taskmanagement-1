import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_city from "@/models/eq_city.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_agents_details from "@/models/eq_agents_details.model";
import Eq_province from "@/models/eq_province.model";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region_id = searchParams.get("region_id");

    if (!region_id) {
      return NextResponse.json(
        { message: "Please pass region_id", status: 400 },
        { status: 400 }
      );
    }

    const region = await Eq_region.findById(region_id)
      .populate("country_id")
      .lean();
    if (!region) {
      return NextResponse.json(
        { message: "Region not found", status: 404 },
        { status: 404 }
      );
    }

    const [provinceCount, cityCount, areaCount, campCount, enquiryCount, agentCount] =
      await Promise.all([
        Eq_province.countDocuments({ region_id }),
        Eq_city.countDocuments({ region_id }),
        Eq_area.countDocuments({ region_id }),
        Eq_camps.countDocuments({ region_id }),
        Eq_enquiry.countDocuments({ region_id }),
        Eq_agents_details.countDocuments({ region_id }),
      ]);

    return NextResponse.json(
      {
        region,
        stats: {
          provinces: provinceCount,
          cities: cityCount,
          areas: areaCount,
          camps: campCount,
          enquiries: enquiryCount,
          agents: agentCount,
        },
        status: 200,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while getting region profile: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
