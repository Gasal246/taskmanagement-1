import { countReadableEnquiries, enquiryActor } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_city from "@/models/eq_city.model";
import Eq_countries from "@/models/eq_countries.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_agents_details from "@/models/eq_agents_details.model";
import Eq_province from "@/models/eq_province.model";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
        await connectDB();
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const country_id = searchParams.get("country_id");

    if (!country_id) {
      return NextResponse.json(
        { message: "Please pass country_id", status: 400 },
        { status: 400 }
      );
    }

    const country = await Eq_countries.findById(country_id).lean();
    if (!country) {
      return NextResponse.json(
        { message: "Country not found", status: 404 },
        { status: 404 }
      );
    }

    const [
      regionCount,
      provinceCount,
      cityCount,
      areaCount,
      campCount,
      enquiryCount,
      agentCount,
    ] = await Promise.all([
      Eq_region.countDocuments({ country_id }),
      Eq_province.countDocuments({ country_id }),
      Eq_city.countDocuments({ country_id }),
      Eq_area.countDocuments({ country_id }),
      Eq_camps.countDocuments({ country_id }),
      countReadableEnquiries({ country_id }, actor),
      Eq_agents_details.countDocuments({ country_id }),
    ]);

    return NextResponse.json(
      {
        country,
        stats: {
          regions: regionCount,
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
    console.log("Error while getting country profile: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
