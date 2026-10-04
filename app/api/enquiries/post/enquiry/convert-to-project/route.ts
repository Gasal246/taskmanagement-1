import { canAdministerEnquiry, enquiryActor } from "@/lib/enquiries/access";
import { auth } from "@/auth";
import { CatalogueValidationError } from "@/lib/enquiries/catalogue-server";
import { resolveProjectCatalogueForCreate } from "@/lib/projects/catalogue";
import { canAdministerBusiness } from "@/lib/server-access";
import connectDB from "@/lib/mongo";
import Projects from "@/models/business_project.model";
import Enquiries from "@/models/eq_enquiries.model";
import Regions from "@/models/business_regions.model";
import Clients from "@/models/business_clients.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import "@/models/eq_camps.model";

const id = z.string().refine(mongoose.isValidObjectId);
const date = z.string().refine(value => Number.isFinite(+new Date(value)));
const schema = z.object({
  enquiry_id: id, business_id: id,
  region_id: id.nullable().optional(), client_id: id.nullable().optional(),
  project_description: z.string().max(10_000).nullable().optional(),
  start_date: date, end_date: date.nullable().optional(), type: z.string().refine(value => (Projects.schema.path("type") as any).enumValues.includes(value), "Select a valid project type"),
}).refine(value => !value.end_date || +new Date(value.end_date) >= +new Date(value.start_date), "End date must follow start date");
class ConversionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function POST(req: Request) {
  let dbSession: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Provide valid project details and dates", status: 400 }, { status: 400 });
    const body = parsed.data;
    if (!session.user.is_super && !await canAdministerBusiness(session.user.id, body.business_id)) return NextResponse.json({ message: "Forbidden", status: 403 }, { status: 403 });
    if (body.region_id && !await Regions.exists({ _id: body.region_id, business_id: body.business_id, status: 1 })) throw new ConversionError(400, "Select a region in this business");
    if (body.client_id && !await Clients.exists({ _id: body.client_id, business_id: body.business_id, status: 1 })) throw new ConversionError(400, "Select a client in this business");
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    dbSession = await mongoose.startSession();
    let projectId = "";
    await dbSession.withTransaction(async () => {
      const enquiry: any = await Enquiries.findById(body.enquiry_id).session(dbSession!).populate("camp_id");
      if (!enquiry) throw new ConversionError(404, "Enquiry not found");
      if (!canAdministerEnquiry(enquiry, actor) || (!actor.isSuper && String(enquiry.business_id) !== body.business_id)) throw new ConversionError(403, "This enquiry belongs to another business or needs ownership review");
      const existing: any = await Projects.findOne({ enquiry_id: enquiry._id }).select("_id business_id").session(dbSession!).lean();
      if (existing) {
        if (String(existing.business_id) !== body.business_id) throw new ConversionError(409, "Enquiry is already converted in another business");
        projectId = String(existing._id);
        return;
      }
      if (enquiry.is_converted) throw new ConversionError(409, "Enquiry is already converted; its project reference needs review");
      if (!enquiry.is_active) throw new ConversionError(409, "Approve the enquiry before converting it");
      const catalogueFields = await resolveProjectCatalogueForCreate(body, dbSession);
      const numericPriority = Number(enquiry.priority);
      const priority = Number.isFinite(numericPriority) ? numericPriority < 3 ? "low" : numericPriority < 7 ? "normal" : "high" : "normal";
      const [project] = await Projects.create([{
        project_name: enquiry.camp_id?.camp_name || enquiry.enquiry_uuid,
        project_description: body.project_description,
        business_id: body.business_id, region_id: body.region_id, client_id: body.client_id,
        creator: session.user.id, start_date: body.start_date, end_date: body.end_date,
        is_approved: true, type: body.type, approved_by: session.user.id, admin_id: session.user.id,
        priority, ...catalogueFields,
      }], { session: dbSession });
      await Enquiries.updateOne({ _id: enquiry._id }, {
        $set: { status: "Closed", is_converted: true, converted_project_id: project._id },
      }, { session: dbSession });
      projectId = String(project._id);
    });
    return NextResponse.json({ message: "Project ready", status: 200, project_id: projectId });
  } catch (error) {
    if (error instanceof ConversionError || error instanceof CatalogueValidationError) {
      const status = error instanceof ConversionError ? error.status : 400;
      return NextResponse.json({ message: error.message, status }, { status });
    }
    console.error("Enquiry conversion failed", error);
    return NextResponse.json({ message: "Unable to convert enquiry", status: 500 }, { status: 500 });
  } finally { await dbSession?.endSession(); }
}
export const dynamic = "force-dynamic";
