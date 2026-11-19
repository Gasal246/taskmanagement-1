import { enquiryLocationScope } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_countries from "@/models/eq_countries.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
  business_id?: string;
  country_name: string;
}

export async function POST(req: NextRequest) {
  try {
        await connectDB();
    const body: Body = await req.json();
    const scope = await enquiryLocationScope(req, true, body.business_id);
    if (scope instanceof NextResponse) return scope;

    if (!body.country_name?.trim()) {
      return NextResponse.json(
        { message: "Country name is required", status: 400 },
        { status: 400 }
      );
    }

    const newCountry = new Eq_countries({
      business_id: scope.businessId,
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
