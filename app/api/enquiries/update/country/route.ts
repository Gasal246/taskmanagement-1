import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  country_id: string;
  country_name?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.country_id) {
      return NextResponse.json(
        { message: "Please pass country_id", status: 400 },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (body.country_name?.trim()) {
      updatePayload.country_name = body.country_name.trim();
    }

    await Eq_countries.findByIdAndUpdate(body.country_id, {
      $set: updatePayload,
    });

    return NextResponse.json(
      { message: "Country updated successfully", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while updating the country: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
