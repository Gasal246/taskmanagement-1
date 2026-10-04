import { actionFilterStages } from "./action-filter-pipeline";
import { escapeSearch, pageBounds } from "@/lib/search";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import mongoose from "mongoose";
import { validateActionFilters } from "./completion";
import { parseFacilityCatalogueFilters } from "./facility-list-filters";
export async function filteredAdminEnquiries(searchParams: URLSearchParams, actorId = "", maxLimit = 50, scope: Record<string, any> = {}) {
    const actionParams = Object.fromEntries(searchParams);
    validateActionFilters(actionParams);
    const catalogueFilters = await parseFacilityCatalogueFilters(searchParams);
    const filter: any = {};
    const businessId = searchParams.get("business_id");
    if (businessId) {
      if (!mongoose.isValidObjectId(businessId)) throw new Error("Invalid enquiry filter ID");
      filter.business_id = new mongoose.Types.ObjectId(businessId);
    }

    // --- Location Filters ---
    const country_id = searchParams.get("country_id");
    const region_id = searchParams.get("region_id");
    const province_id = searchParams.get("province_id");
    const city_id = searchParams.get("city_id");
    const area_id = searchParams.get("area_id");
    const camp_id = searchParams.get("camp_id");
    const enquiry_brought_by = searchParams.get("enquiry_brought_by");
    const created_by = searchParams.get("created_by");
    const enquiry_uuid = searchParams.get("enquiry_uuid");
    const camp_capacity = searchParams.get("capacity");
    const search = searchParams.get("search");
    const occupancy = searchParams.get("occupancy");
    const { page, limit, skip } = pageBounds(searchParams, 10, maxLimit);
    const approval = searchParams.get("is_active");
    const approvalStages = approval === "true" || approval === "false" ? [{ $match: { is_active: approval === "true" } }] : [];

    if (country_id && mongoose.Types.ObjectId.isValid(country_id)) filter.country_id = new mongoose.Types.ObjectId(country_id);
    if (region_id && mongoose.Types.ObjectId.isValid(region_id)) filter.region_id = new mongoose.Types.ObjectId(region_id);
    if (province_id && mongoose.Types.ObjectId.isValid(province_id)) filter.province_id = new mongoose.Types.ObjectId(province_id);
    if (city_id && mongoose.Types.ObjectId.isValid(city_id)) filter.city_id = new mongoose.Types.ObjectId(city_id);
    if (area_id && mongoose.Types.ObjectId.isValid(area_id)) filter.area_id = new mongoose.Types.ObjectId(area_id);
    if (camp_id && mongoose.Types.ObjectId.isValid(camp_id)) filter.camp_id = new mongoose.Types.ObjectId(camp_id);
    if (enquiry_brought_by && mongoose.Types.ObjectId.isValid(enquiry_brought_by)) filter.enquiry_brought_by = new mongoose.Types.ObjectId(enquiry_brought_by);
    if (created_by && mongoose.Types.ObjectId.isValid(created_by)) filter.createdBy = new mongoose.Types.ObjectId(created_by);

    // --- Status / Boolean filters ---
    const status = searchParams.get("status");
    const statusValues = status?.split(",").map((value) => value.trim()).filter((value) => value && value !== "all") ?? [];
    if (statusValues.length === 1) filter.status = statusValues[0];
    if (statusValues.length > 1) filter.status = { $in: statusValues };

    const wifi_available = searchParams.get("wifi_available");
    if (wifi_available !== null) {
      filter.wifi_available = wifi_available === "true";
    }

    const competition = searchParams.get("competition");
    if (competition !== null) {
      filter.competition_status = competition === "true";
    }

    const selectedPriority = Number(searchParams.get("priority"));
    const hasPriorityFilter = Number.isFinite(selectedPriority) && selectedPriority > 0;

    // --- Date Filters ---
    const from_date = searchParams.get("from_date");
    const due_date = searchParams.get("due_date");
    const lease_expiry = searchParams.get("lease_expiry");

    if (from_date) filter.createdAt = { $gte: new Date(from_date) };
    if (due_date) filter.due_date = { $lte: new Date(due_date) };
    if (lease_expiry) filter.lease_expiry_due = { $lte: new Date(lease_expiry) };

    if (enquiry_uuid) filter.enquiry_uuid = { $regex: escapeSearch(enquiry_uuid), $options: "i" };

    const campJoinStages: any[] = [
      { $lookup: { from: Eq_camps.collection.name, localField: "camp_id", foreignField: "_id", as: "campDetails" } },
      { $unwind: { path: "$campDetails", preserveNullAndEmptyArrays: true } },
    ];
    const needsCampFilter = Boolean(catalogueFilters.project_sector || catalogueFilters.facility_type || camp_capacity || occupancy || search);
    const campPresentationStages = [{ $addFields: { camp_id: "$campDetails" } }, { $project: { campDetails: 0, latestHistory: 0 } }];
    const pipeline: any[] = [
      { $match: { $and: [scope, filter] } },
      ...(!hasPriorityFilter ? [{ $sort: { createdAt: -1, _id: -1 } }] : []),
      ...(needsCampFilter ? campJoinStages : []),
    ];

    if (catalogueFilters.project_sector) {
      pipeline.push({ $match: { "campDetails.project_sector": catalogueFilters.project_sector } });
    }
    if (catalogueFilters.facility_type) {
      pipeline.push({ $match: { "campDetails.facility_type": catalogueFilters.facility_type } });
    }

    if (camp_capacity) {
      pipeline.push({ $match: { "campDetails.camp_capacity": camp_capacity } });
    }

    if (occupancy) {
      pipeline.push({ $match: { "campDetails.camp_occupancy": { $gte: Number(occupancy) } } });
    }

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { enquiry_uuid: { $regex: escapeSearch(search), $options: "i" } },
            { "campDetails.camp_name": { $regex: escapeSearch(search), $options: "i" } },
          ],
        },
      });
    }

    if (hasPriorityFilter) {
      pipeline.push(
        {
          $addFields: {
            priorityNumber: {
              $convert: {
                input: "$priority",
                to: "int",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        { $match: { priorityNumber: { $gte: selectedPriority } } }
      );
    }

    if (needsCampFilter) pipeline.push(...campPresentationStages);
    if (hasPriorityFilter) pipeline.push({ $sort: { priorityNumber: 1, createdAt: -1, _id: -1 } });

    pipeline.push(...actionFilterStages(actionParams, actorId));
    pipeline.push({ $facet: {
      data: [...approvalStages, { $skip: skip }, { $limit: limit }, ...(!needsCampFilter ? [...campJoinStages, ...campPresentationStages] : [])],
      count: [...approvalStages, { $count: "total" }],
      badges: [{ $group: { _id: { $ifNull: ["$is_active", false] }, count: { $sum: 1 } } }],
    } });
    const [result] = await Eq_enquiry.aggregate(pipeline);
    const totalRecords = result?.count?.[0]?.total || 0;
    return { data: result?.data || [], badges: { all: (result?.badges || []).reduce((sum: number, row: any) => sum + row.count, 0), waitingApproval: result?.badges?.find((row: any) => !row._id)?.count || 0 }, pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
}
