import connectDB from "@/lib/mongo";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const head_office_id = searchParams.get("head_office_id");

    if (!head_office_id) {
      return NextResponse.json(
        { message: "Please pass head_office_id", status: 400 },
        { status: 400 }
      );
    }

    const headOffice = await Eq_camp_headoffice.findById(head_office_id).lean();
    if (!headOffice) {
      return NextResponse.json(
        { message: "Head office not found", status: 404 },
        { status: 404 }
      );
    }

    await Eq_camps.updateMany(
      { headoffice_id: head_office_id },
      { $set: { headoffice_id: null } }
    );

    await Eq_camp_headoffice.findByIdAndDelete(head_office_id);

    return NextResponse.json(
      { message: "Head office removed", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while deleting head office: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
