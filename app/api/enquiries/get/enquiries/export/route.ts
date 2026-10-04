import mongoose from "mongoose";
import { canAdministerEnquiry, enquiryManagementFilter } from "@/lib/enquiries/access";
import { filteredAdminEnquiries } from "@/lib/enquiries/admin-list";
import { enquiryActor } from "@/lib/enquiries/completion-server";
import { FacilityCatalogueFilterError } from "@/lib/enquiries/facility-list-filters";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import "@/models/eq_city.model";
import "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

const MAX_EXPORT_RECORDS = 200;

export async function POST(req: NextRequest) {
  try {
        await connectDB();
    const body = await req.json();
    const enquiryIds: string[] = Array.isArray(body?.enquiry_ids) ? body.enquiry_ids : [];
    const filters = body?.filters ?? null;
    if (enquiryIds.some(id => typeof id !== "string" || !mongoose.isValidObjectId(id))) return NextResponse.json({ message: "Select valid enquiry IDs" }, { status: 400 });

    if (!enquiryIds.length && !filters) {
      return NextResponse.json(
        { message: "Please pass enquiry_ids or filters", status: 400 },
        { status: 400 }
      );
    }

    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!actor.admin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (enquiryIds.length > MAX_EXPORT_RECORDS) return NextResponse.json({ message: `Select at most ${MAX_EXPORT_RECORDS} enquiries per export`, status: 400 }, { status: 400 });
    let selectedIds = enquiryIds;
    let totalMatching = enquiryIds.length;
    if (!selectedIds.length) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters || {})) if (value !== "" && value != null) params.set(key, String(value));
      params.set("page", "1"); params.set("limit", String(MAX_EXPORT_RECORDS));
      const result = await filteredAdminEnquiries(params, actor.actorId, MAX_EXPORT_RECORDS, enquiryManagementFilter(actor));
      totalMatching = result.pagination.totalRecords;
      selectedIds = result.data.map((entry: any) => entry._id);
    }
    const enquiries: any[] = await Eq_enquiry.find({ _id: { $in: selectedIds } })
      .populate({ path: "city_id", select: "city_name" })
      .populate({ path: "area_id", select: "area_name" })
      .populate({ path: "camp_id", model: Eq_camps, select: "camp_name camp_occupancy headoffice_id latitude longitude", populate: { path: "headoffice_id", model: Eq_camp_headoffice, select: "phone geo_location other_details address" } })
      .sort({ createdAt: -1 }).lean();

    if (!enquiries.length) {
      return NextResponse.json({ status: 200, data: [] }, { status: 200 });
    }

    if (enquiries.some(entry => !canAdministerEnquiry(entry, actor))) return NextResponse.json({ message: "You cannot export another business’s enquiries" }, { status: 403 });

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

    return NextResponse.json({ status: 200, data: payload, export: { totalMatching, exported: payload.length, limit: MAX_EXPORT_RECORDS, truncated: totalMatching > payload.length } }, { status: 200 });
  } catch (err) {
    if (err instanceof FacilityCatalogueFilterError || (err instanceof Error && /Invalid (action filter|action scope|period range|search|pagination|enquiry filter ID)/.test(err.message))) return NextResponse.json({ message: err.message, status: 400 }, { status: 400 });
    console.error("Error exporting enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
