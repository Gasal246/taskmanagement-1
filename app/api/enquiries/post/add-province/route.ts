import connectDB from "@/lib/mongo";
import Eq_province from "@/models/eq_province.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  province_name: string;
  country: string;
  region: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.country || !body.region) {
      return NextResponse.json(
        { message: "Country and region are required", status: 400 },
        { status: 400 }
      );
    }

    if (!body.province_name?.trim()) {
      return NextResponse.json(
        { message: "Province name is required", status: 400 },
        { status: 400 }
      );
    }

    const newProvince = new Eq_province({
      country_id: body.country,
      region_id: body.region,
      province_name: body.province_name.trim(),
    });

    await newProvince.save();

    return NextResponse.json(
      { message: "New province created", status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding new province: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
