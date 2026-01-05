import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_city from "@/models/eq_city.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_province from "@/models/eq_province.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const province_id = searchParams.get("province_id");

    if (!province_id) {
      return NextResponse.json(
        { message: "Please pass province_id", status: 400 },
        { status: 400 }
      );
    }

    const province = await Eq_province.findById(province_id).lean();
    if (!province) {
      return NextResponse.json(
        { message: "Province not found", status: 404 },
        { status: 404 }
      );
    }

    const [cityCount, areaCount, campCount, enquiryCount] = await Promise.all([
      Eq_city.countDocuments({ province_id }),
      Eq_area.countDocuments({ province_id }),
      Eq_camps.countDocuments({ province_id }),
      Eq_enquiry.countDocuments({ province_id }),
    ]);

    const totalChildren = cityCount + areaCount + campCount + enquiryCount;

    if (totalChildren > 0) {
      return NextResponse.json(
        {
          message: "Remove related records before deleting this province.",
          status: 409,
          counts: {
            cities: cityCount,
            areas: areaCount,
            camps: campCount,
            enquiries: enquiryCount,
          },
        },
        { status: 409 }
      );
    }

    await Eq_province.findByIdAndDelete(province_id);

    return NextResponse.json(
      { message: "Province removed", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while deleting province: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
