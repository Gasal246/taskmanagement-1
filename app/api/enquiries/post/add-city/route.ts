import connectDB from "@/lib/mongo";
import Eq_city from "@/models/eq_city.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  city_name: string;
  country: string;
  region: string;
  province: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.country || !body.region || !body.province) {
      return NextResponse.json(
        { message: "Country, region, and province are required", status: 400 },
        { status: 400 }
      );
    }

    if (!body.city_name?.trim()) {
      return NextResponse.json(
        { message: "City name is required", status: 400 },
        { status: 400 }
      );
    }

    const newCity = new Eq_city({
      country_id: body.country,
      region_id: body.region,
      province_id: body.province,
      city_name: body.city_name.trim(),
    });

    await newCity.save();

    return NextResponse.json(
      { message: "New city created", status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding new city: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
