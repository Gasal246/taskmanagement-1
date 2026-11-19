import { enquiryLocationScope, validateLocationParents } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
  business_id?: string;
  region_name: string;
  country: string;
}

export async function POST(req: NextRequest) {
  try {
        await connectDB();
    const body: Body = await req.json();
    const scope = await enquiryLocationScope(req, true, body.business_id);
    if (scope instanceof NextResponse) return scope;
    const invalidParents = await validateLocationParents({country_id: body.country}, scope.businessId!);
    if (invalidParents) return invalidParents;

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
      business_id: scope.businessId,
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
