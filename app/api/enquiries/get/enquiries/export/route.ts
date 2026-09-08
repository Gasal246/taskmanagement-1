import { filteredAdminEnquiries } from "@/lib/enquiries/admin-list";
import { enquiryActor } from "@/lib/enquiries/completion-server";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import "@/models/eq_city.model";
import "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const MAX_EXPORT_RECORDS = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const enquiryIds: string[] = Array.isArray(body?.enquiry_ids) ? body.enquiry_ids : [];
    const filters = body?.filters ?? null;

    if (!enquiryIds.length && !filters) {
      return NextResponse.json(
        { message: "Please pass enquiry_ids or filters", status: 400 },
        { status: 400 }
      );
    }

    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!actor.admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    let selectedIds = enquiryIds;
    if (!selectedIds.length) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters || {})) if (value !== "" && value != null) params.set(key, String(value));
      params.set("page", "1"); params.set("limit", String(MAX_EXPORT_RECORDS));
      selectedIds = (await filteredAdminEnquiries(params)).data.map((entry: any) => entry._id);
    }
    const enquiries: any[] = await Eq_enquiry.find({ _id: { $in: selectedIds } })
      .populate({ path: "city_id", select: "city_name" })
      .populate({ path: "area_id", select: "area_name" })
      .populate({ path: "camp_id", model: Eq_camps, select: "camp_name camp_occupancy headoffice_id latitude longitude", populate: { path: "headoffice_id", model: Eq_camp_headoffice, select: "phone geo_location other_details address" } })
      .sort({ createdAt: -1 }).lean();

    if (!enquiries.length) {
      return NextResponse.json({ status: 200, data: [] }, { status: 200 });
    }

    const enquiryIdList = enquiries.map((entry) => entry._id);
    const contacts = await Eq_camp_contacts.find({ enquiry_id: { $in: enquiryIdList } }).lean();
    const contactsByEnquiry = new Map<string, any[]>();

    contacts.forEach((contact) => {
      const key = String(contact.enquiry_id);
      const current = contactsByEnquiry.get(key) ?? [];
      current.push(contact);
      contactsByEnquiry.set(key, current);
    });

    const payload = enquiries.map((entry) => ({
      ...entry,
      contacts: contactsByEnquiry.get(String(entry._id)) ?? [],
    }));

    return NextResponse.json({ status: 200, data: payload }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && /Invalid (completion filter|period range)/.test(err.message)) return NextResponse.json({ message: err.message, status: 400 }, { status: 400 });
    console.error("Error exporting enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
