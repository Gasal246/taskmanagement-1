import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  region_id: string;
  region_name?: string;
  country?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.region_id) {
      return NextResponse.json(
        { message: "Please pass region_id", status: 400 },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (body.region_name?.trim()) {
      updatePayload.region_name = body.region_name.trim();
    }

    if (body.country) {
      updatePayload.country_id = body.country;
    }

    await Eq_region.findByIdAndUpdate(body.region_id, {
      $set: updatePayload,
    });

    return NextResponse.json(
      { message: "Region updated successfully", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while updating the region: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
