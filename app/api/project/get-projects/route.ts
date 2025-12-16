import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import { NextRequest } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const business_id = searchParams.get("business_id");
    const section = searchParams.get("section");
    const domainWise = searchParams.get("domainWise");
    const domainId = searchParams.get("domainId");
    const department = searchParams.get("department");
    const area = searchParams.get("area");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: any = {};

    // Always require business_id
    if (business_id) {
      query.business_id = business_id;
    }

    // Handle section
    if (section) {
      switch (section) {
        case "waiting":
          query.is_approved = false;
          break;
        case "current":
          query.is_approved = true;
          query.status = { $in: ["approved", "pending"] };
          break;
        case "previous":
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

    // Handle date filter
    if (startDate || endDate) {
      query.start_date = {};
      if (startDate) query.start_date.$gte = new Date(startDate);
      if (endDate) query.start_date.$lte = new Date(endDate);
    }

    console.log("Mongo Query:", query);

    const projects = await Business_Project.find(query).exec();
    console.log("Fetched Projects:", projects.length);

    return Response.json(projects);
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
