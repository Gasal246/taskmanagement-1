import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session)
      return NextResponse.json(
        { message: "Unauthorized Access", status: 401 },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);

    // Filters
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const country_id = searchParams.get("country_id");
    const region_id = searchParams.get("region_id");
    const province_id = searchParams.get("province_id");
    const city_id = searchParams.get("city_id");
    const area_id = searchParams.get("area_id");
    const camp_id = searchParams.get("camp_id");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const wifi_available = searchParams.get("wifi_available");
    const competition_status = searchParams.get("competition");
    const enquiry_uuid = searchParams.get("enquiry_uuid");

    /* ---------------------------------------------------
       1️⃣ FETCH ALL ENQUIRIES ASSIGNED TO USER (from history)
    -----------------------------------------------------*/
    const assignedHistory = await Eq_enquiry_histories
      .find({ assigned_to: session.user.id })
      .select("enquiry_id")
      .lean();

    if (!assignedHistory.length) {
      return NextResponse.json({ enquiries: [], status: 200 });
    }

    /* ---------------------------------------------------
       2️⃣ EXTRACT UNIQUE ENQUIRY IDS
    -----------------------------------------------------*/
    const uniqueEnquiryIds = [
      ...new Set(assignedHistory.map((h) => String(h.enquiry_id))),
    ];

    /* ---------------------------------------------------
       3️⃣ BUILD FILTER QUERY
    -----------------------------------------------------*/
    let filterQuery: any = { _id: { $in: uniqueEnquiryIds } };

    if (status) filterQuery.status = status;
    if (priority) filterQuery.priority = priority;

    if (country_id) filterQuery.country_id = country_id;
    if (region_id) filterQuery.region_id = region_id;
    if (province_id) filterQuery.province_id = province_id;
    if (city_id) filterQuery.city_id = city_id;
    if (area_id) filterQuery.area_id = area_id;
    if (camp_id) filterQuery.camp_id = camp_id;

    if (wifi_available) filterQuery.wifi_available = wifi_available === "true";
    if (competition_status)
      filterQuery.competition_status = competition_status === "true";

    if (from_date || to_date) {
      filterQuery.createdAt = {};
      if (from_date) filterQuery.createdAt.$gte = new Date(from_date);
      if (to_date) filterQuery.createdAt.$lte = new Date(to_date);
    }

    /* ---------------------------------------------------
       4️⃣ FETCH FILTERED ENQUIRIES FROM MAIN ENQUIRY TABLE
    -----------------------------------------------------*/
    const enquiries = await Eq_enquiry.find(filterQuery).populate({
        path: "camp_id",
        select: "camp_name camp_occupancy"
    }).lean();

    return NextResponse.json({ enquiries, status: 200 }, {status: 200});
  } catch (err) {
    console.log("Error while getting user assigned enquiries: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
