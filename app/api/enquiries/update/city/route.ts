import { enquiryLocationScope, validateLocationParents } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_city from "@/models/eq_city.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
  city_id: string;
  city_name?: string;
  country?: string;
  region?: string;
  province?: string;
}

export async function PUT(req: NextRequest) {
  try {
        await connectDB();
    const body: Body = await req.json();
    const scope = await enquiryLocationScope(req, true);
    if (scope instanceof NextResponse) return scope;
    const existing: any = await Eq_city.findOne({ _id: body.city_id, ...scope.filter }).lean();
    if (!existing) return NextResponse.json({ message: "Location not found" }, { status: 404 });
    const invalidParents = await validateLocationParents({country_id: body.country || existing.country_id?.toString(), region_id: body.region || existing.region_id?.toString(), province_id: body.province || existing.province_id?.toString()}, scope.businessId!);
    if (invalidParents) return invalidParents;

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

    await Eq_city.findOneAndUpdate({ _id: body.city_id, ...scope.filter }, {
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
