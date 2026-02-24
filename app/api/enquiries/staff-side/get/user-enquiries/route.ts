import { auth } from "@/auth";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_camps.model";

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
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
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    /* ----------------------------------------------------------------
       STEP 1: Get unique enquiry_ids from access table
    -----------------------------------------------------------------*/
    const accessDocs = await Eq_enquiry_access.find({
      user_id: session.user.id,
    }).select("enquiry_id");

    const uniqueEnquiryIds = [
      ...new Set(accessDocs.map((d: any) => String(d.enquiry_id))),
    ];

    /* ----------------------------------------------------------------
       STEP 2: Build MongoDB filter for enquiries
    -----------------------------------------------------------------*/
    const membershipFilters: any[] = [{ createdBy: session.user.id }];
    if (uniqueEnquiryIds.length > 0) {
      membershipFilters.push({ _id: { $in: uniqueEnquiryIds } });
    }

    const match: any = {};
    if (membershipFilters.length === 1) {
      Object.assign(match, membershipFilters[0]);
    } else {
      match.$or = membershipFilters;
    }

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

    const totalRecords = await Eq_enquiry.countDocuments(match);
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

    if (skip >= totalRecords && totalRecords > 0) {
      return NextResponse.json(
        { status: 200, data: [], enquiries: [], pagination: { page, limit, totalRecords, totalPages } },
        { status: 200 }
      );
    }

    const enquiries = await Eq_enquiry.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("camp_id")
      .lean();

    const enquiryIds = enquiries.map((entry: any) => entry?._id).filter(Boolean);
    let latestPriorityByEnquiry = new Map<string, number>();

    if (enquiryIds.length) {
      const histories = await Eq_enquiry_histories.find({
        enquiry_id: { $in: enquiryIds },
        assigned_to: session.user.id,
      })
        .sort({ createdAt: -1 })
        .select("enquiry_id priority")
        .lean();

      for (const history of histories as any[]) {
        const enquiryId = String(history?.enquiry_id || "");
        if (!enquiryId || latestPriorityByEnquiry.has(enquiryId)) continue;
        if (history?.priority === undefined || history?.priority === null || history?.priority === "") continue;
        latestPriorityByEnquiry.set(enquiryId, Number(history.priority));
      }
    }

    const enrichedEnquiries = enquiries.map((entry: any) => ({
      ...entry,
      forwarded_priority: latestPriorityByEnquiry.get(String(entry?._id)) ?? null,
    }));

    return NextResponse.json(
      { status: 200, data: enrichedEnquiries, enquiries: enrichedEnquiries, pagination: { page, limit, totalRecords, totalPages } },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while getting staff enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
