import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

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
    const enquiry_brought_by = searchParams.get("enquiry_brought_by");
    const created_by = searchParams.get("created_by");
    const enquiry_uuid = searchParams.get("enquiry_uuid");
    const camp_capacity = searchParams.get("capacity");
    const search = searchParams.get("search");
    const occupancy = searchParams.get("occupancy");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;

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

    const next_action = searchParams.get("next_action");
    const actionFilter = next_action && next_action !== "all" ? next_action : "";

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

    if (enquiry_uuid) filter.enquiry_uuid = { $regex: enquiry_uuid, $options: "i" };

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: Eq_camps.collection.name,
          localField: "camp_id",
          foreignField: "_id",
          as: "campDetails",
        },
      },
      {
        $unwind: {
          path: "$campDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

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
            { enquiry_uuid: { $regex: search, $options: "i" } },
            { "campDetails.camp_name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    if (actionFilter) {
      pipeline.push(
        {
          $lookup: {
            from: "eq_enquiry_histories",
            let: { enquiryId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$enquiry_id", "$$enquiryId"] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { action: 1 } },
            ],
            as: "latestHistory",
          },
        },
        {
          $unwind: {
            path: "$latestHistory",
            preserveNullAndEmptyArrays: false,
          },
        },
        { $match: { "latestHistory.action": actionFilter } }
      );
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

    pipeline.push(
      { $addFields: { camp_id: "$campDetails" } },
      { $project: { campDetails: 0, latestHistory: 0 } }
    );

    pipeline.push(
      hasPriorityFilter
        ? { $sort: { priorityNumber: 1, createdAt: -1 } }
        : { $sort: { createdAt: -1 } }
    );

    pipeline.push({
      $facet: {
        metadata: [{ $count: "totalRecords" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const result = await Eq_enquiry.aggregate(pipeline);
    const metadata = result?.[0]?.metadata?.[0];
    const totalRecords = metadata?.totalRecords ?? 0;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
    const data = result?.[0]?.data ?? [];

    return NextResponse.json(
      { status: 200, data, pagination: { page, limit, totalRecords, totalPages } },
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
