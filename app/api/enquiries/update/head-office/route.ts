import connectDB from "@/lib/mongo";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  head_office_id: string;
  phone?: string;
  geo_location?: string;
  other_details?: string;
  address?: string;
  camp_ids?: string[];
}

export async function PUT(req: NextRequest) {
  try {
    const body: Body = await req.json();

    if (!body.head_office_id) {
      return NextResponse.json(
        { message: "Please pass head_office_id", status: 400 },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (body.phone !== undefined) updatePayload.phone = body.phone.trim();
    if (body.geo_location !== undefined) updatePayload.geo_location = body.geo_location.trim();
    if (body.other_details !== undefined) updatePayload.other_details = body.other_details.trim();
    if (body.address !== undefined) updatePayload.address = body.address.trim();

    const headOffice = await Eq_camp_headoffice.findById(body.head_office_id);
    if (!headOffice) {
      return NextResponse.json(
        { message: "Head office not found", status: 404 },
        { status: 404 }
      );
    }

    if (Object.keys(updatePayload).length) {
      await Eq_camp_headoffice.findByIdAndUpdate(body.head_office_id, {
        $set: updatePayload,
      });
    }

    if (Array.isArray(body.camp_ids)) {
      const currentCamps = await Eq_camps.find({ headoffice_id: body.head_office_id })
        .select("_id")
        .lean();

      const currentIds = currentCamps.map((camp: any) => String(camp._id));
      const nextIds = body.camp_ids.map((id) => String(id));

      const toDetach = currentIds.filter((id) => !nextIds.includes(id));
      const toAttach = nextIds.filter((id) => !currentIds.includes(id));

      if (toDetach.length) {
        await Eq_camps.updateMany(
          { _id: { $in: toDetach }, headoffice_id: body.head_office_id },
          { $set: { headoffice_id: null } }
        );
      }

      if (toAttach.length) {
        await Eq_camps.updateMany(
          { _id: { $in: toAttach } },
          { $set: { headoffice_id: body.head_office_id } }
        );
      }
    }

    return NextResponse.json(
      { message: "Head office updated", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while updating head office: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
