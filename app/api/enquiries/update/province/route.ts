import { enquiryLocationScope, validateLocationParents } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_province from "@/models/eq_province.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
  province_id: string;
  province_name?: string;
  country?: string;
  region?: string;
}

export async function PUT(req: NextRequest) {
  try {
        await connectDB();
    const body: Body = await req.json();
    const scope = await enquiryLocationScope(req, true);
    if (scope instanceof NextResponse) return scope;
    const existing: any = await Eq_province.findOne({ _id: body.province_id, ...scope.filter }).lean();
    if (!existing) return NextResponse.json({ message: "Location not found" }, { status: 404 });
    const invalidParents = await validateLocationParents({country_id: body.country || existing.country_id?.toString(), region_id: body.region || existing.region_id?.toString()}, scope.businessId!);
    if (invalidParents) return invalidParents;

    if (!body.province_id) {
      return NextResponse.json(
        { message: "Please pass province_id", status: 400 },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (body.province_name?.trim()) {
      updatePayload.province_name = body.province_name.trim();
    }

    if (body.country) {
      updatePayload.country_id = body.country;
    }

    if (body.region) {
      updatePayload.region_id = body.region;
    }

    await Eq_province.findOneAndUpdate({ _id: body.province_id, ...scope.filter }, {
      $set: updatePayload,
    });

    return NextResponse.json(
      { message: "Province updated successfully", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while updating the province: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
