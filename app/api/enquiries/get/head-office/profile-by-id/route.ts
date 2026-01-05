import connectDB from "@/lib/mongo";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const head_office_id = searchParams.get("head_office_id");

    if (!head_office_id) {
      return NextResponse.json(
        { message: "Please pass head_office_id", status: 400 },
        { status: 400 }
      );
    }

    const head_office = await Eq_camp_headoffice.findById(head_office_id).lean();
    if (!head_office) {
      return NextResponse.json(
        { message: "Head office not found", status: 404 },
        { status: 404 }
      );
    }

    const camps = await Eq_camps.find({ headoffice_id: head_office_id })
      .populate("country_id")
      .populate("region_id")
      .populate("province_id")
      .populate("city_id")
      .populate("area_id")
      .select("camp_name country_id region_id province_id city_id area_id")
      .lean();

    return NextResponse.json(
      {
        head_office,
        camps,
        camp_count: camps.length,
        status: 200,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while getting head office profile: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
