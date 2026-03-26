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

    const filter: Record<string, any> = {};
    let actionFilter = "";

    if (enquiryIds.length) {
      filter._id = { $in: enquiryIds };
    } else if (filters) {
      const {
        country_id,
        region_id,
        province_id,
        city_id,
        area_id,
        camp_id,
        enquiry_brought_by,
        created_by,
        status,
        next_action,
        wifi_available,
        competition,
        priority,
        from_date,
        due_date,
        lease_expiry,
        enquiry_uuid,
        search,
        capacity,
      } = filters;

      if (country_id) filter.country_id = country_id;
      if (region_id) filter.region_id = region_id;
      if (province_id) filter.province_id = province_id;
      if (city_id) filter.city_id = city_id;
      if (area_id) filter.area_id = area_id;
      if (camp_id) filter.camp_id = camp_id;
      if (enquiry_brought_by) filter.enquiry_brought_by = enquiry_brought_by;
      if (created_by) filter.createdBy = created_by;
      if (status && status !== "all") filter.status = status;
      actionFilter = next_action && next_action !== "all" ? next_action : "";
      if (priority) filter.priority = priority;
      if (enquiry_uuid) filter.enquiry_uuid = { $regex: enquiry_uuid, $options: "i" };

      if (wifi_available !== null && wifi_available !== undefined && wifi_available !== "") {
        filter.wifi_available = wifi_available === true || wifi_available === "true";
      }

      if (competition !== null && competition !== undefined && competition !== "") {
        filter.competition_status = competition === true || competition === "true";
      }

      if (from_date) filter.createdAt = { $gte: new Date(from_date) };
      if (due_date) filter.due_date = { $lte: new Date(due_date) };
      if (lease_expiry) filter.lease_expiry_due = { $lte: new Date(lease_expiry) };

      if (search) {
        const searchRegex = new RegExp(search, "i");
        const campsForSearch = await Eq_camps.find({ camp_name: searchRegex })
          .select("_id")
          .lean();
        const campIdsForSearch = campsForSearch.map((camp) => camp._id);
        filter.$or = [
          { enquiry_uuid: { $regex: searchRegex } },
          ...(campIdsForSearch.length ? [{ camp_id: { $in: campIdsForSearch } }] : []),
        ];
      }

      if (capacity) {
        const camps = await Eq_camps.find({ camp_capacity: capacity }).select("_id").lean();
        const campIds = camps.map((camp) => camp._id);
        if (!campIds.length) {
          return NextResponse.json({ status: 200, data: [] }, { status: 200 });
        }
        filter.camp_id = { $in: campIds };
      }
    }

    let enquiries: any[] = [];

    if (!enquiryIds.length) {
      const latestIds = await Eq_enquiry.find(filter)
        .sort({ createdAt: -1 })
        .limit(MAX_EXPORT_RECORDS)
        .select("_id")
        .lean();
      let latestIdList = latestIds.map((entry) => entry._id);

      if (!latestIdList.length) {
        return NextResponse.json({ status: 200, data: [] }, { status: 200 });
      }

      if (actionFilter) {
        const latestActions = await Eq_enquiry_histories.aggregate([
          { $match: { enquiry_id: { $in: latestIdList } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$enquiry_id", action: { $first: "$action" } } },
          { $match: { action: actionFilter } },
        ]);
        const allowedIds = new Set(latestActions.map((entry) => String(entry._id)));
        latestIdList = latestIdList.filter((entry) => allowedIds.has(String(entry)));
      }

      if (!latestIdList.length) {
        return NextResponse.json({ status: 200, data: [] }, { status: 200 });
      }

      enquiries = await Eq_enquiry.find({ _id: { $in: latestIdList } })
        .populate({ path: "city_id", select: "city_name" })
        .populate({ path: "area_id", select: "area_name" })
        .populate({
          path: "camp_id",
          model: Eq_camps,
          select: "camp_name camp_occupancy headoffice_id latitude longitude",
          populate: {
            path: "headoffice_id",
            model: Eq_camp_headoffice,
            select: "phone geo_location other_details address",
          },
        })
        .select("enquiry_uuid city_id area_id camp_id latitude longitude wifi_type status priority next_action comments")
        .sort({ createdAt: -1 })
        .lean();

      if (filters?.occupancy) {
        const minOccupancy = Number(filters.occupancy);
        enquiries = enquiries.filter((entry) => entry.camp_id?.camp_occupancy >= minOccupancy);
      }
    } else {
      enquiries = await Eq_enquiry.find(filter)
        .populate({ path: "city_id", select: "city_name" })
        .populate({ path: "area_id", select: "area_name" })
        .populate({
          path: "camp_id",
          model: Eq_camps,
          select: "camp_name camp_occupancy headoffice_id latitude longitude",
          populate: {
            path: "headoffice_id",
            model: Eq_camp_headoffice,
            select: "phone geo_location other_details address",
          },
        })
        .select("enquiry_uuid city_id area_id camp_id latitude longitude wifi_type status priority next_action comments")
        .sort({ createdAt: -1 })
        .lean();
    }

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
    console.error("Error exporting enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
