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
    const camp_capacity = searchParams.get("capacity");
    const search = searchParams.get("search");
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

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const campsForSearch = await Eq_camps.find({ camp_name: searchRegex }).select("_id").lean();
      const campIdsForSearch = campsForSearch.map((camp) => camp._id);
      filter.$or = [
        { enquiry_uuid: { $regex: searchRegex } },
        ...(campIdsForSearch.length ? [{ camp_id: { $in: campIdsForSearch } }] : []),
      ];
    }

    // --- NEW: Occupancy Filter (From Camps Schema) ---
    const occupancy = searchParams.get("occupancy");



    let campIds : any[] = [];

    if(camp_capacity){
      const camps = await Eq_camps.find({camp_capacity: camp_capacity}).select("_id").lean();
      campIds = camps.map((c)=> c._id);
      if(campIds.length == 0){
        return NextResponse.json({ status: 200, data: [], pagination: {page, limit, totalRecords: 0, totalPages:0}}, {status: 200})
      }
      filter.camp_id = {$in: campIds};
    };

    // Take count of total docs (cap at latest 200)
    const maxRecords = 200;
    const totalRecordsRaw = await Eq_enquiry.countDocuments(filter);
    const totalRecords = Math.min(totalRecordsRaw, maxRecords);

    const latestIds = await Eq_enquiry.find(filter)
      .sort({ createdAt: -1 })
      .limit(maxRecords)
      .select("_id")
      .lean();
    const latestIdList = latestIds.map((entry) => entry._id);
    if (latestIdList.length === 0) {
      return NextResponse.json(
        { status: 200, data: [], pagination: { page, limit, totalRecords: 0, totalPages: 0 } },
        { status: 200 }
      );
    }

    if (skip >= totalRecords) {
      return NextResponse.json(
        { status: 200, data: [], pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } },
        { status: 200 }
      );
    }

    // First fetch enquiries + populate camp
    let enquiries = await Eq_enquiry.find({ _id: { $in: latestIdList } })
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
