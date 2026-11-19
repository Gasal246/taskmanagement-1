import { enquiryLocationScope, validateLocationParents } from "@/lib/enquiries/location-scope";
import connectDB from "@/lib/mongo";
import Eq_region from "@/models/eq_region.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
  region_id: string;
  region_name?: string;
  country?: string;
}

export async function PUT(req: NextRequest) {
  try {
        await connectDB();
    const body: Body = await req.json();
    const scope = await enquiryLocationScope(req, true);
    if (scope instanceof NextResponse) return scope;
    const existing: any = await Eq_region.findOne({ _id: body.region_id, ...scope.filter }).lean();
    if (!existing) return NextResponse.json({ message: "Location not found" }, { status: 404 });
    const invalidParents = await validateLocationParents({country_id: body.country || existing.country_id?.toString()}, scope.businessId!);
    if (invalidParents) return invalidParents;

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

    await Eq_region.findOneAndUpdate({ _id: body.region_id, ...scope.filter }, {
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
