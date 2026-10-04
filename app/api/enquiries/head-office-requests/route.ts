import { notifyHeadOffice } from "@/lib/notifications/head-office";
import { approveEnquiryFacility } from "@/lib/enquiries/approve-facility";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import { enquiryActor, canReadEnquiry, canAdministerEnquiry, resolveEnquiryCreationBusiness } from "@/lib/enquiries/access";
import { HeadOfficeError, campInBusiness, officeInBusiness, requestBusiness, submitOfficeRequest, reviewOfficeRequest, officeDetails } from "@/lib/enquiries/head-office-requests";
import Requests from "@/models/eq_head_office_request.model";
import Offices from "@/models/eq_camp_headoffice.model";
import Camps from "@/models/eq_camps.model";
import Enquiries from "@/models/eq_enquiries.model";
import "@/models/users.model";
const responseError = (error: any) => NextResponse.json({ message: error.code === 11000 ? "A pending request already exists. Refresh before continuing" : error.message || "Unable to process request" }, { status: error.code === 11000 ? 409 : (error.name === "VersionError" ? 409 : error.status || 500) });

export async function GET(req: NextRequest) {
  try {
    await connectDB(); const actor = await enquiryActor();
    if (!actor) throw new HeadOfficeError(401, "Unauthorized");
    const enquiryId = req.nextUrl.searchParams.get("enquiry_id");
    let businessId: string | null; let enquiry: any = null;
    if (enquiryId) {
      if (!mongoose.isValidObjectId(enquiryId)) throw new HeadOfficeError(400, "Invalid enquiry");
      enquiry = await Enquiries.findById(enquiryId).lean();
      if (!enquiry || !await canReadEnquiry(enquiry, actor)) throw new HeadOfficeError(403, "You cannot access this enquiry");
      businessId = String(enquiry.business_id || "");
    } else businessId = await resolveEnquiryCreationBusiness(req, actor, req.nextUrl.searchParams.get("business_id"));
    if (!businessId) throw new HeadOfficeError(403, "Select a business before managing head offices");
    const isAdmin = canAdministerEnquiry({ business_id: businessId }, actor);
    const filter: any = { business_id: businessId, ...(enquiryId ? { enquiry_id: enquiryId } : isAdmin ? {} : { requested_by: actor.actorId }) };
    const requests: any[] = await Requests.find(filter).sort({ createdAt: -1 }).populate("requested_by", "name").populate("reviewed_by", "name").populate("enquiry_id", "enquiry_uuid camp_id").populate("camp_ids", "camp_name headoffice_id").populate("detach_camp_ids", "camp_name").lean();
    const ownCamps: any[] = await Camps.find({ $or: [{ business_id: businessId }, { _id: { $in: await Enquiries.find({ business_id: businessId }).distinct("camp_id") } }] }).select("headoffice_id").lean();
    const candidates: any[] = await Offices.find({ $or: [{ business_id: businessId }, { _id: { $in: ownCamps.map(camp => camp.headoffice_id).filter(Boolean) }, business_id: null }] }).sort({ address: 1 }).lean();
    // Resolve catalogue ownership in batches rather than issuing queries per office.
    const directoryCamps: any[] = await Camps.find({ headoffice_id: { $in: candidates.map(office => office._id) } }).select("business_id headoffice_id").lean();
    const relations: any[] = await Enquiries.find({ camp_id: { $in: directoryCamps.map(camp => camp._id) } }).select("business_id camp_id").lean();
    const offices = candidates.filter(office => {
      const linked = directoryCamps.filter(camp => String(camp.headoffice_id) === String(office._id));
      if (!office.business_id && !linked.length) return false;
      return linked.every(camp => {
        const businesses = relations.filter(enquiry => String(enquiry.camp_id) === String(camp._id)).map(enquiry => String(enquiry.business_id || ""));
        return (!camp.business_id || String(camp.business_id) === businessId) && businesses.every(value => value === businessId) && (camp.business_id || businesses.includes(businessId!));
      });
    });
    for (const request of requests) {
      request.affected_facilities = request.office_id ? await Camps.find({ headoffice_id: request.office_id }).select("camp_name").lean() : [];
      request.pending_facility = Boolean(request.enquiry_id && !(await Enquiries.findById(request.enquiry_id._id).select("is_active").lean() as any)?.is_active);
      request.selected_office = offices.find(office => String(office._id) === String(request.selected_office_id));
      request.current_offices = await Offices.find({ _id: { $in: request.before_links.map((link: any) => link.office_id).filter(Boolean) } }).select("address phone geo_location other_details").lean();
    }
    const selectedCampId = enquiry?.camp_id || req.nextUrl.searchParams.get("camp_id");
    let camp: any = null;
    if (selectedCampId) {
      try { camp = await campInBusiness(selectedCampId, businessId); }
      catch (error) {
        // An approved, unclaimed catalogue facility can be selected for a new enquiry.
        if (enquiry || !(error instanceof HeadOfficeError) || error.status !== 403) throw error;
        camp = await Camps.findOne({ _id: selectedCampId, is_active: true, business_id: null }).lean();
        if (!camp || await Enquiries.exists({ camp_id: selectedCampId })) throw error;
      }
    }
    const currentOffice: any = camp?.headoffice_id ? await Offices.findById(camp.headoffice_id).lean() : null;
    return NextResponse.json({ requests, offices, current_office: currentOffice ? { _id: currentOffice._id, ...officeDetails(currentOffice) } : null, business_id: businessId, is_admin: isAdmin, actor_id: actor.actorId });
  } catch (error) { return responseError(error); }
}
export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB(); const actor = await enquiryActor(); if (!actor) throw new HeadOfficeError(401, "Unauthorized");
    const body = await req.json(); session = await mongoose.startSession(); let result;
    await session.withTransaction(async () => {
      const { businessId, enquiry } = await requestBusiness(req, actor, body, session);
      result = await submitOfficeRequest(actor, businessId, { ...body, ...(enquiry ? { camp_ids: [enquiry.camp_id] } : {}) }, session);
    });
    return NextResponse.json({ request: result, message: result ? "Head office request submitted for admin approval" : "No head office changes to request", status: 201 }, { status: 201 });
  } catch (error) { return responseError(error); } finally { await session?.endSession(); }
}
export async function PATCH(req: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB(); const actor = await enquiryActor(); if (!actor) throw new HeadOfficeError(401, "Unauthorized");
    const body = await req.json(); if (!mongoose.isValidObjectId(body.request_id)) throw new HeadOfficeError(400, "Invalid request");
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      if (body.decision === "withdraw") {
        const result = await Requests.updateOne({ _id: body.request_id, requested_by: actor.actorId, status: "pending", revision: body.revision }, { $set: { status: "withdrawn", reviewed_at: new Date() } }, { session });
        if (!result.modifiedCount) throw new HeadOfficeError(409, "This request cannot be withdrawn or has changed");
        await notifyHeadOffice(await Requests.findById(body.request_id).session(session!), actor.actorId, "withdrawn", session);
      } else {
        const reviewed = await reviewOfficeRequest(actor, body.request_id, body, session!);
        if (body.decision === "approve" && body.approve_facility) {
          if (!reviewed.enquiry_id) throw new HeadOfficeError(400, "This request has no linked enquiry");
          const enquiry: any = await Enquiries.findById(reviewed.enquiry_id).session(session!).lean();
          await approveEnquiryFacility(actor, { enquiry_id: String(enquiry._id), camp_id: String(enquiry.camp_id) }, session!);
        }
      }
    });
    return NextResponse.json({ message: "Head office request updated", status: 200 });
  } catch (error) { return responseError(error); } finally { await session?.endSession(); }
}
