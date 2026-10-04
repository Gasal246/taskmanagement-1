import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import mongoose from "mongoose";
import { actionFilterStages } from "@/lib/enquiries/action-filter-pipeline";
import { escapeSearch, pageBounds } from "@/lib/search";
import { validateActionFilters } from "@/lib/enquiries/completion";
import { enrichEnquiries, enquiryActor } from "@/lib/enquiries/completion-server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import { staffEnquiryVisibilityStages } from "@/lib/enquiries/staff-visibility-pipeline";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";
import { FacilityCatalogueFilterError, parseFacilityCatalogueFilters } from "@/lib/enquiries/facility-list-filters";

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

export async function GET(req: NextRequest) {
  try {
        await connectDB();
    const session: any = await auth();
    if (!session)
      return NextResponse.json(
        { message: "Unauthorized Access", status: 401 },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);

    const completionParams = Object.fromEntries(searchParams);
    validateActionFilters(completionParams);
    const catalogueFilters = await parseFacilityCatalogueFilters(searchParams);
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    const { page, limit, skip } = pageBounds(searchParams);
    const parsedSearch = parseSearchQuery(search);
    const actorId = new mongoose.Types.ObjectId(actor.actorId);
    const match: any = {};
    const statusValues = status?.split(",").map(value => value.trim()).filter(value => value && value !== "all") || [];
    if (statusValues.length) match.status = { $in: statusValues };
    for (const [field, value] of Object.entries({ country_id, region_id, province_id, city_id, area_id, camp_id, enquiry_brought_by, createdBy: created_by })) {
      if (value) {
        if (!mongoose.isValidObjectId(value)) throw new Error("Invalid enquiry filter ID");
        match[field] = new mongoose.Types.ObjectId(value);
      }
    }
    if (wifi_available) match.wifi_available = wifi_available === "true";
    if (competition_status) match.competition_status = competition_status === "true";
    if (enquiry_uuid) match.enquiry_uuid = { $regex: escapeSearch(enquiry_uuid), $options: "i" };
    if (from_date || to_date) {
      match.createdAt = {};
      if (from_date) match.createdAt.$gte = new Date(from_date);
      if (to_date) match.createdAt.$lte = new Date(to_date);
      if (Object.values(match.createdAt).some(value => !Number.isFinite(+(value as Date)))) throw new Error("Invalid period range");
    }
    const pipeline: any[] = [
      ...staffEnquiryVisibilityStages(actorId, match),
      { $lookup: { from: Eq_camps.collection.name, localField: "camp_id", foreignField: "_id", pipeline: [
        { $project: { camp_name: 1, camp_occupancy: 1, project_sector: 1, facility_type: 1, facility_type_detail: 1, facility_type_other: 1, camp_type: 1 } },
      ], as: "camp_id" } },
      { $unwind: { path: "$camp_id", preserveNullAndEmptyArrays: true } },
    ];
    if (catalogueFilters.project_sector) pipeline.push({ $match: { "camp_id.project_sector": catalogueFilters.project_sector } });
    if (catalogueFilters.facility_type) pipeline.push({ $match: { "camp_id.facility_type": catalogueFilters.facility_type } });
    pipeline.push(
      { $lookup: { from: Eq_enquiry_histories.collection.name, localField: "_id", foreignField: "enquiry_id", pipeline: [
        { $match: { assigned_to: actorId, priority: { $nin: [null, ""] } } },
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { priority: 1 } },
      ], as: "_priority" } },
      { $set: { forwarded_priority: { $ifNull: [{ $arrayElemAt: ["$_priority.priority", 0] }, null] } } },
      { $unset: "_priority" },
      ...actionFilterStages(completionParams, actor.actorId),
    );
    for (const term of parsedSearch.generalTerms) pipeline.push({ $match: { $or: [
      { enquiry_uuid: { $regex: escapeSearch(term), $options: "i" } }, { "camp_id.camp_name": { $regex: escapeSearch(term), $options: "i" } },
    ] } });
    const searchFields: Record<string, any> = {
      status: "$status", priority: { $ifNull: ["$forwarded_priority", "$priority"] }, occupancy: "$camp_id.camp_occupancy",
      wifi: { $cond: ["$wifi_available", "yes true available 1", "no false unavailable 0"] },
    };
    for (const [field, values] of Object.entries(parsedSearch.fieldFilters)) for (const value of values) {
      pipeline.push({ $match: { $expr: { $regexMatch: { input: { $convert: { input: searchFields[field], to: "string", onNull: "", onError: "" } }, regex: escapeSearch(value), options: "i" } } } });
    }
    const selectedPriority = Number(priority);
    const hasPriorityFilter = Number.isFinite(selectedPriority) && selectedPriority > 0;
    if (hasPriorityFilter) pipeline.push(
      { $set: { _priorityNumber: { $convert: { input: { $ifNull: ["$forwarded_priority", "$priority"] }, to: "double", onNull: null, onError: null } } } },
      { $match: { _priorityNumber: { $gte: selectedPriority } } },
    );
    pipeline.push({ $facet: {
      data: [{ $sort: hasPriorityFilter ? { _priorityNumber: 1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 } }, { $skip: skip }, { $limit: limit }, { $unset: "_priorityNumber" }],
      count: [{ $count: "total" }],
    } });
    const [result] = await Eq_enquiry.aggregate(pipeline);
    const totalRecords = result?.count?.[0]?.total || 0;
    const data = await enrichEnquiries(result?.data || [], actor);
    return NextResponse.json({ status: 200, data, pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } });
  } catch (err) {
    const unavailable = temporaryDatabaseFailureResponse(err);
    if (unavailable) return unavailable;
    if (err instanceof FacilityCatalogueFilterError || (err instanceof Error && /Invalid (action filter|action scope|period range|search|pagination|enquiry filter ID)/.test(err.message))) return NextResponse.json({ message: err.message, status: 400 }, { status: 400 });
    console.log("Error while getting staff enquiries:", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
