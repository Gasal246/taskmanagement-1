import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  country_name: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.country_name?.trim()) {
      return NextResponse.json(
        { message: "Country name is required", status: 400 },
        { status: 400 }
      );
    }

    const newCountry = new Eq_countries({
      country_name: body.country_name.trim(),
    });

    await newCountry.save();

    return NextResponse.json(
      { message: "New country created", status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding new country: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
