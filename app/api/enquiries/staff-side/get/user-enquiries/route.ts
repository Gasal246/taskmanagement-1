import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_camps.model";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json(
        { message: "Unauthorized Access", status: 401 },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);

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

    /* ----------------------------------------------------------------
       STEP 1: Get unique enquiry_ids from access table
    -----------------------------------------------------------------*/
    const accessDocs = await Eq_enquiry_access.find({
      user_id: session.user.id,
    }).select("enquiry_id");

    const uniqueEnquiryIds = [
      ...new Set(accessDocs.map((d: any) => String(d.enquiry_id))),
    ];

    if (uniqueEnquiryIds.length === 0) {
      return NextResponse.json({ enquiries: [], status: 200 });
    }

    /* ----------------------------------------------------------------
       STEP 2: Build MongoDB filter for enquiries
    -----------------------------------------------------------------*/
    const match: any = {
      _id: { $in: uniqueEnquiryIds },
    };

    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (country_id) match.country_id = country_id;
    if (region_id) match.region_id = region_id;
    if (province_id) match.province_id = province_id;
    if (city_id) match.city_id = city_id;
    if (area_id) match.area_id = area_id;
    if (camp_id) match.camp_id = camp_id;
    if(wifi_available) match.wifi_availae = wifi_available == "true"
    if (competition_status) match.competition_status = competition_status == "true"
    if (enquiry_uuid) match.enquiry_uuid = {$regex: enquiry_uuid, $options: "i" };

    // Date filters
    if (from_date)
      match.createdAt = { ...(match.createdAt || {}), $gte: new Date(from_date) };

    if (to_date)
      match.createdAt = { ...(match.createdAt || {}), $lte: new Date(to_date) };

    /* ----------------------------------------------------------------
       STEP 3: Fetch only the real enquiries (NO DUPLICATES)
    -----------------------------------------------------------------*/

    const enquiries = await Eq_enquiry.find(match)
      .populate("camp_id")
      .lean();

    return NextResponse.json({ enquiries, status: 200 });
  } catch (err) {
    console.log("Error while getting staff enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
