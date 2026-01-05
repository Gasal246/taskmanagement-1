import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");

    if (!contact_id) {
      return NextResponse.json(
        { message: "Please pass contact_id", status: 400 },
        { status: 400 }
      );
    }

    const contact = await Eq_camp_contacts.findById(contact_id).lean();
    if (!contact) {
      return NextResponse.json(
        { message: "Contact not found", status: 404 },
        { status: 404 }
      );
    }

    await Eq_camp_contacts.findByIdAndDelete(contact_id);

    return NextResponse.json(
      { message: "Contact removed", status: 200 },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while deleting contact: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
