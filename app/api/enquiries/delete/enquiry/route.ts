import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");

        if (!enquiry_id) {
            return NextResponse.json({ message: "Enquiry ID Missing", status: 400 }, { status: 400 });
        }

        const enquiry = await Eq_enquiry.findById(enquiry_id);
        if (!enquiry) {
            return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
        }

        await Eq_enquiry_wifi_external.deleteMany({ enquiry_id });
        await Eq_enquiry_wifi_personal.deleteMany({ enquiry_id });
        await Eq_enquiry_histories.deleteMany({ enquiry_id });
        await Eq_enquiry_access.deleteMany({ enquiry_id });
        await Eq_Enquiry_External_Wifi_Edit.deleteMany({ enquiry_id });
        await Eq_Enquiry_Personal_Wifi_Edit.deleteMany({ enquiry_id });
        await Eq_Enquiry_Edit.deleteMany({ enquiry_id });
        await Eq_camp_contacts.deleteMany({ enquiry_id });
        await Eq_enquiry.findByIdAndDelete(enquiry_id);

        return NextResponse.json({ message: "Enquiry deleted", status: 200 }, { status: 200 });
    } catch (err) {
        console.log("Error while deleting enquiry: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
