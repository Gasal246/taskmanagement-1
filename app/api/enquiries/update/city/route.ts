import connectDB from "@/lib/mongo";
import Eq_city from "@/models/eq_city.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  city_id: string;
  city_name?: string;
  country?: string;
  region?: string;
  province?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.city_id) {
      return NextResponse.json(
        { message: "Please pass city_id", status: 400 },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (body.city_name?.trim()) {
      updatePayload.city_name = body.city_name.trim();
    }

    if (body.country) {
      updatePayload.country_id = body.country;
    }

    if (body.region) {
      updatePayload.region_id = body.region;
    }

    if (body.province) {
      updatePayload.province_id = body.province;
    }

    await Eq_city.findByIdAndUpdate(body.city_id, {
      $set: updatePayload,
    });

    return NextResponse.json(
      { message: "City updated successfully", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while updating the city: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
