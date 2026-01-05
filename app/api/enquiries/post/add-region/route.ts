import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  region_name: string;
  country: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.country) {
      return NextResponse.json(
        { message: "Country is required", status: 400 },
        { status: 400 }
      );
    }

    if (!body.region_name?.trim()) {
      return NextResponse.json(
        { message: "Region name is required", status: 400 },
        { status: 400 }
      );
    }

    const newRegion = new Eq_region({
      country_id: body.country,
      region_name: body.region_name.trim(),
    });

    await newRegion.save();

    return NextResponse.json(
      { message: "New region created", status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding new region: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
