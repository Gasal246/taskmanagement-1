import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const SEARCHABLE_FIELD_KEYS = new Set(["status", "priority", "occupancy", "wifi"]);

function parseSearchQuery(rawSearch: string | null) {
  const search = String(rawSearch ?? "").trim();
  if (!search) {
    return {
      generalTerms: [] as string[],
      fieldFilters: {
        status: [] as string[],
        priority: [] as string[],
        occupancy: [] as string[],
        wifi: [] as string[],
      },
    };
  }

  const clauses = search
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = {
    generalTerms: [] as string[],
    fieldFilters: {
      status: [] as string[],
      priority: [] as string[],
      occupancy: [] as string[],
      wifi: [] as string[],
    },
  };

  clauses.forEach((clause) => {
    const match = clause.match(/^([a-zA-Z_]+)\s*:\s*(.+)$/);
    if (!match) {
      parsed.generalTerms.push(clause.toLowerCase());
      return;
    }

    const key = match[1].trim().toLowerCase() as keyof typeof parsed.fieldFilters;
    const value = match[2].trim().toLowerCase();

    if (SEARCHABLE_FIELD_KEYS.has(key)) {
      parsed.fieldFilters[key].push(value);
      return;
    }

    parsed.generalTerms.push(clause.toLowerCase());
  });

  return parsed;
}

function matchesInlineSearch(entry: any, parsedSearch: ReturnType<typeof parseSearchQuery>) {
  if (
    parsedSearch.generalTerms.length === 0 &&
    parsedSearch.fieldFilters.status.length === 0 &&
    parsedSearch.fieldFilters.priority.length === 0 &&
    parsedSearch.fieldFilters.occupancy.length === 0 &&
    parsedSearch.fieldFilters.wifi.length === 0
  ) {
    return true;
  }

  const uuid = String(entry?.enquiry_uuid ?? "").toLowerCase();
  const campName = String(entry?.camp_id?.camp_name ?? "").toLowerCase();
  const status = String(entry?.status ?? "").toLowerCase();
  const priority = String(entry?.forwarded_priority ?? entry?.priority ?? "").toLowerCase();
  const occupancy = String(entry?.camp_id?.camp_occupancy ?? "").toLowerCase();
  const wifi = entry?.wifi_available ? "yes true available 1" : "no false unavailable 0";

  const matchesGeneralTerms = parsedSearch.generalTerms.every(
    (term) => uuid.includes(term) || campName.includes(term)
  );
  if (!matchesGeneralTerms) return false;

  const matchesStatus = parsedSearch.fieldFilters.status.every((value) => status.includes(value));
  if (!matchesStatus) return false;

  const matchesPriority = parsedSearch.fieldFilters.priority.every((value) =>
    priority.includes(value)
  );
  if (!matchesPriority) return false;

  const matchesOccupancy = parsedSearch.fieldFilters.occupancy.every((value) =>
    occupancy.includes(value)
  );
  if (!matchesOccupancy) return false;

  const matchesWifi = parsedSearch.fieldFilters.wifi.every((value) => wifi.includes(value));
  if (!matchesWifi) return false;

  return true;
}

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
    const enquiry_brought_by = searchParams.get("enquiry_brought_by");
    const created_by = searchParams.get("created_by");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const wifi_available = searchParams.get("wifi_available");
    const competition_status = searchParams.get("competition");
    const enquiry_uuid = searchParams.get("enquiry_uuid");
    const search = searchParams.get("search");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;
    const parsedSearch = parseSearchQuery(search);

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

    const statusValues = status?.split(",").map((value) => value.trim()).filter((value) => value && value !== "all") ?? [];
    if (statusValues.length === 1) match.status = statusValues[0];
    if (statusValues.length > 1) match.status = { $in: statusValues };
    if (country_id) match.country_id = country_id;
    if (region_id) match.region_id = region_id;
    if (province_id) match.province_id = province_id;
    if (city_id) match.city_id = city_id;
    if (area_id) match.area_id = area_id;
    if (camp_id) match.camp_id = camp_id;
    if (enquiry_brought_by) match.enquiry_brought_by = enquiry_brought_by;
    if (created_by) match.createdBy = created_by;
    if (wifi_available) match.wifi_available = wifi_available == "true";
    if (competition_status) match.competition_status = competition_status == "true";
    if (enquiry_uuid) match.enquiry_uuid = { $regex: enquiry_uuid, $options: "i" };

    // Date filters
    if (from_date)
      match.createdAt = { ...(match.createdAt || {}), $gte: new Date(from_date) };

    if (to_date)
      match.createdAt = { ...(match.createdAt || {}), $lte: new Date(to_date) };

    /* ----------------------------------------------------------------
       STEP 3: Fetch only the real enquiries (NO DUPLICATES)
    -----------------------------------------------------------------*/

    let enquiries = await Eq_enquiry.find(match)
      .populate({
        path: "camp_id",
        model: Eq_camps,
        select: "camp_name camp_occupancy",
      })
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

    enquiries = enquiries.map((entry: any) => ({
      ...entry,
      forwarded_priority: latestPriorityByEnquiry.get(String(entry?._id)) ?? null,
    }));

    if (search) {
      enquiries = enquiries.filter((entry: any) => matchesInlineSearch(entry, parsedSearch));
    }

    const selectedPriority = Number(priority);
    const hasPriorityFilter = Number.isFinite(selectedPriority) && selectedPriority > 0;

    if (hasPriorityFilter) {
      enquiries = enquiries
        .filter((entry: any) => {
          const priorityNumber = Number(entry?.forwarded_priority ?? entry?.priority);
          return Number.isFinite(priorityNumber) && priorityNumber >= selectedPriority;
        })
        .sort((a: any, b: any) => {
          const priorityA = Number(a?.forwarded_priority ?? a?.priority);
          const priorityB = Number(b?.forwarded_priority ?? b?.priority);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return new Date(b?.createdAt).getTime() - new Date(a?.createdAt).getTime();
        });
    } else {
      enquiries.sort(
        (a: any, b: any) => new Date(b?.createdAt).getTime() - new Date(a?.createdAt).getTime()
      );
    }

    const totalRecords = enquiries.length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

    if (skip >= totalRecords && totalRecords > 0) {
      return NextResponse.json(
        { status: 200, data: [], enquiries: [], pagination: { page, limit, totalRecords, totalPages } },
        { status: 200 }
      );
    }

    const paginatedEnquiries = enquiries.slice(skip, skip + limit);

    return NextResponse.json(
      { status: 200, data: paginatedEnquiries, enquiries: paginatedEnquiries, pagination: { page, limit, totalRecords, totalPages } },
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
