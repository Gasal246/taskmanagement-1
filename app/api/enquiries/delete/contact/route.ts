import { authorizeEnquiry, enquiryActor, editableEnquiryForCamp } from "@/lib/enquiries/access";
import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
        await connectDB();
    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");

    if (!contact_id) {
      return NextResponse.json(
        { message: "Please pass contact_id", status: 400 },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(contact_id)) return NextResponse.json({ message: "Provide a valid contact ID" }, { status: 400 });
    const contact: any = await Eq_camp_contacts.findById(contact_id).lean();
    if (!contact) {
      return NextResponse.json(
        { message: "Contact not found", status: 404 },
        { status: 404 }
      );
    }

        if (contact.enquiry_id) {
            const denied = await authorizeEnquiry(String(contact.enquiry_id), "edit");
            if (denied) return denied;
        } else {
            const actor = await enquiryActor();
            if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            if (!await editableEnquiryForCamp(String(contact.camp_id), actor)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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
