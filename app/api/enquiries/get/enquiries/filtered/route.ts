import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filter: any = {};

    // --- Location Filters ---
    const country_id = searchParams.get("country_id");
    const region_id = searchParams.get("region_id");
    const province_id = searchParams.get("province_id");
    const city_id = searchParams.get("city_id");
    const area_id = searchParams.get("area_id");
    const camp_id = searchParams.get("camp_id");
    const enquiry_uuid = searchParams.get("enquiry_uuid");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;

    if (country_id) filter.country_id = country_id;
    if (region_id) filter.region_id = region_id;
    if (province_id) filter.province_id = province_id;
    if (city_id) filter.city_id = city_id;
    if (area_id) filter.area_id = area_id;
    if (camp_id) filter.camp_id = camp_id;

    // --- Status / Boolean filters ---
    const status = searchParams.get("status");
    if (status) filter.status = status;

    const wifi_available = searchParams.get("wifi_available");
    if (wifi_available !== null) {
      filter.wifi_available = wifi_available === "true";
    }

    const competition = searchParams.get("competition");
    if (competition !== null) {
      filter.competition_status = competition === "true";
    }

    const priority = searchParams.get("priority");
    if (priority) filter.priority = priority;

    // --- Date Filters ---
    const from_date = searchParams.get("from_date");
    const due_date = searchParams.get("due_date");
    const lease_expiry = searchParams.get("lease_expiry");

    if (from_date) filter.createdAt = { $gte: new Date(from_date) };
    if (due_date) filter.due_date = { $lte: new Date(due_date) };
    if (lease_expiry) filter.lease_expiry_due = { $lte: new Date(lease_expiry) };

    if (enquiry_uuid) filter.enquiry_uuid = { $regex: enquiry_uuid, $options: "i" };

    // --- NEW: Occupancy Filter (From Camps Schema) ---
    const occupancy = searchParams.get("occupancy");

    // Take count of total docs
    const totalRecords = await Eq_enquiry.countDocuments(filter);

    // First fetch enquiries + populate camp
    let enquiries = await Eq_enquiry.find(filter)
      .populate({
        path: "camp_id",
        model: Eq_camps,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Apply occupancy filter AFTER populate
    if (occupancy) {
      enquiries = enquiries.filter(e => {
        return e.camp_id && e.camp_id.camp_occupancy >= Number(occupancy);
      });
    }
    console.log("filter: ", filter);  

    return NextResponse.json(
      { status: 200, data: enquiries, pagination: {page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit)}},
      { status: 200 }
    );
  } catch (err) {
    console.error("Error filtering enquiries:", err);
    return NextResponse.json(
      { status: 500, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
