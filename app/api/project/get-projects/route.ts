import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import "@/models/business_clients.model";
import "@/models/business_regions.model";
import "@/models/business_areas.model";
import "@/models/users.model";
import { NextRequest } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const business_id = searchParams.get("business_id");
    const section = searchParams.get("section");
    const tab = searchParams.get("tab") || searchParams.get("status") || section;
    const domainWise = searchParams.get("domainWise");
    const domainId = searchParams.get("domainId");
    const department = searchParams.get("department");
    const area = searchParams.get("area");
    const region_id = searchParams.get("region_id");
    const area_id = searchParams.get("area_id");
    const client_id = searchParams.get("client_id");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    const query: any = {};

    // Always require business_id
    if (business_id) {
      query.business_id = business_id;
    }

    // Handle section/tab status filter
    if (tab) {
      switch (tab) {
        case "waiting":
        case "waiting-for-approval":
        case "waiting_for_approval":
          query.is_approved = false;
          break;
        case "current":
        case "ongoing":
        case "on-going":
        case "on_going":
          query.is_approved = true;
          query.status = { $in: ["approved", "pending"] };
          break;
        case "previous":
        case "completed":
          query.status = "completed";
          break;
      }
    }

    // Handle domainWise
    if (domainWise) {
      switch (domainWise) {
        case "region":
          if (domainId) query.region_id = domainId;
          if (department) query.department_id = department;
          if (area) query.area_id = area;
          break;
        case "client":
          if (domainId) query.client_id = domainId;
          break;
        case "department":
          if(domainId) query.type = domainId;
      }
    }

    if (region_id) query.region_id = region_id;
    if (area_id) query.area_id = area_id;
    if (client_id) query.client_id = client_id;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Handle date filter
    if (startDate || endDate) {
      query.start_date = {};
      if (startDate) query.start_date.$gte = new Date(startDate);
      if (endDate) query.start_date.$lte = new Date(endDate);
    }

    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Business_Project.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("client_id", "client_name")
        .populate("region_id", "region_name")
        .populate("area_id", "area_name region_id")
        .populate("creator", "name email avatar_url")
        .populate("admin_id", "name email avatar_url")
        .lean(),
      Business_Project.countDocuments(query)
    ]);

    return Response.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
