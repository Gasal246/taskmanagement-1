import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const area_id = searchParams.get("area_id");

        if (!area_id) {
            return NextResponse.json({ message: "Please pass area_id", status: 400 }, { status: 400 });
        }

        const area = await Eq_area.findById(area_id).lean();
        if (!area) {
            return NextResponse.json({ message: "Area not found", status: 404 }, { status: 404 });
        }

        const enquiries = await Eq_enquiry.find({ area_id }).select("_id").lean();
        const enquiryIds = enquiries.map((enquiry: any) => enquiry._id);

        if (enquiryIds.length) {
            await Eq_enquiry_wifi_external.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_enquiry_wifi_personal.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_enquiry_histories.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_enquiry_access.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_Enquiry_External_Wifi_Edit.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_Enquiry_Personal_Wifi_Edit.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_Enquiry_Edit.deleteMany({ enquiry_id: { $in: enquiryIds } });
            await Eq_enquiry.deleteMany({ _id: { $in: enquiryIds } });
        }

        const camps = await Eq_camps.find({ area_id }).select("_id").lean();
        const campIds = camps.map((camp: any) => camp._id);

        if (campIds.length) {
            await Eq_camp_contacts.deleteMany({ camp_id: { $in: campIds } });
            await Eq_camps.deleteMany({ _id: { $in: campIds } });
        }

        await Eq_area.findByIdAndDelete(area_id);

        return NextResponse.json({ message: "Area removed", status: 200 }, { status: 200 });
    } catch (err) {
        console.log("Error while deleting Area: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
