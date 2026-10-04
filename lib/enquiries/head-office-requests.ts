import { notifyHeadOffice } from "@/lib/notifications/head-office";
import { inTransaction } from "@/lib/jobs/transaction";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Requests from "@/models/eq_head_office_request.model";
import Offices from "@/models/eq_camp_headoffice.model";
import Camps from "@/models/eq_camps.model";
import Enquiries from "@/models/eq_enquiries.model";
import { canAdministerEnquiry, canEditEnquiry, resolveEnquiryCreationBusiness, type EnquiryActor } from "./access";

export class HeadOfficeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const officeDetails = (value: any) => Object.fromEntries(["address", "phone", "geo_location", "other_details"].map(key => [key, String(value?.[key] ?? "").trim()]));
const id = (value: any) => String(value?._id || value || "");
const fail = (status: number, message: string): never => { throw new HeadOfficeError(status, message); };
const validId = (value: any) => mongoose.isValidObjectId(value);

export async function campInBusiness(campId: any, businessId: string, session?: mongoose.ClientSession) {
  if (!validId(campId)) return fail(400, "Invalid facility");
  const camp: any = await Camps.findById(campId).session(session || null).lean();
  if (!camp) return fail(404, "Facility not found");
  const linked = (await Enquiries.find({ camp_id: campId }).distinct("business_id").session(session || null)).map(id);
  if ((camp.business_id && id(camp.business_id) !== businessId) || linked.some(value => value !== businessId) || (!camp.business_id && !linked.includes(businessId))) return fail(403, "Facility ownership must match this business");
  return camp;
}
export async function officeInBusiness(officeId: any, businessId: string, session?: mongoose.ClientSession) {
  if (!validId(officeId)) return fail(400, "Select a valid head office");
  const office: any = await Offices.findById(officeId).session(session || null).lean();
  if (!office) return fail(404, "Head office not found");
  if (office.business_id && id(office.business_id) !== businessId) return fail(403, "Head office belongs to another business");
  const camps: any[] = await Camps.find({ headoffice_id: officeId }).session(session || null).lean();
  if (!office.business_id && !camps.length) return fail(403, "This legacy head office needs business ownership review");
  for (const camp of camps) await campInBusiness(camp._id, businessId, session);
  return office;
}
export async function requestBusiness(req: Request, actor: EnquiryActor, body: any, session?: mongoose.ClientSession) {
  if (body.enquiry_id) {
    if (!validId(body.enquiry_id)) return fail(400, "Invalid enquiry");
    const enquiry: any = await Enquiries.findById(body.enquiry_id).session(session || null).lean();
    if (!enquiry || !await canEditEnquiry(enquiry, actor)) return fail(403, "You cannot edit this enquiry");
    const businessId = id(enquiry.business_id);
    if (!businessId) return fail(403, "Review the enquiry business ownership first");
    if (!canAdministerEnquiry(enquiry, actor) && !await resolveEnquiryCreationBusiness(req, actor, businessId)) return fail(403, "Active business membership is required");
    return { businessId, enquiry };
  }
  const businessId = await resolveEnquiryCreationBusiness(req, actor, body.business_id);
  if (!businessId) return fail(403, "Select an active business you belong to");
  return { businessId, enquiry: null };
}

export async function submitOfficeRequest(actor: EnquiryActor, businessId: string, input: any, session?: mongoose.ClientSession): Promise<any> {
  if (!session) return inTransaction(dbSession => submitOfficeRequest(actor, businessId, input, dbSession));
  const operation = input.operation;
  if (!["create", "link", "edit", "remove"].includes(operation)) return fail(400, "Choose a head office action");
  const campIds = [...new Set<string>((input.camp_ids || []).map(id))];
  const detachIds = [...new Set<string>((input.detach_camp_ids || []).map(id))].filter(value => !campIds.includes(value));
  const camps = await Promise.all([...campIds, ...detachIds].map(campId => campInBusiness(campId, businessId, session)));
  if (["link", "remove"].includes(operation) && !camps.length) return fail(400, "Select at least one facility");
  let office: any = null;
  if (operation === "edit") {
    office = await officeInBusiness(input.office_id, businessId, session);
    if (input.enquiry_id && camps.some(camp => id(camp.headoffice_id) !== id(office))) return fail(409, "The facility head office has changed. Refresh before submitting");
  }
  if (operation === "link") await officeInBusiness(input.selected_office_id, businessId, session);
  const proposed = officeDetails(input.proposed);
  if (["create", "edit"].includes(operation) && !Object.values(proposed).some(Boolean)) return fail(400, "Enter head office details");
  if (Object.values(proposed).some(value => value.length > 2000)) return fail(400, "Head office fields must be 2000 characters or fewer");
  if (operation === "edit" && JSON.stringify(officeDetails(office)) === JSON.stringify(proposed) && !input.request_id && !detachIds.length && camps.every(camp => id(camp.headoffice_id) === id(office))) return null;
  if (operation === "link" && camps.every(camp => id(camp.headoffice_id) === id(input.selected_office_id)) && !input.request_id) return null;
  if (operation === "remove" && camps.every(camp => !camp.headoffice_id) && !input.request_id) return null;
  const scopeKey = input.enquiry_id ? `enquiry:${input.enquiry_id}` : operation === "edit" ? `office:${input.office_id}` : `business:${businessId}:staff:${actor.actorId}:${campIds.sort().join(",") || createHash("sha256").update(JSON.stringify(proposed)).digest("hex")}`;
  let existing: any = input.request_id ? await Requests.findById(input.request_id).session(session || null) : await Requests.findOne({ scope_key: scopeKey, status: "pending" }).session(session || null);
  if (existing && (existing.status !== "pending" || id(existing.requested_by) !== actor.actorId || id(existing.business_id) !== businessId || (input.enquiry_id ? existing.scope_key !== scopeKey : Boolean(existing.enquiry_id)))) return fail(409, "This request cannot be changed. Ask its requester or an administrator to review it");
  if (existing && Number(input.revision) !== existing.revision) return fail(409, "A pending request already exists or has changed. Refresh it before revising");
  const payload = { business_id: businessId, requested_by: actor.actorId, enquiry_id: input.enquiry_id || null, camp_ids: campIds, detach_camp_ids: detachIds,
    office_id: office?._id || null, selected_office_id: operation === "link" ? input.selected_office_id : null,
    operation, proposed, before_office: office ? officeDetails(office) : null,
    before_links: camps.map(camp => ({ camp_id: camp._id, office_id: camp.headoffice_id || null })), scope_key: existing?.scope_key || scopeKey };
  if (existing) {
    existing.revisions.push({ operation: existing.operation, proposed: existing.proposed, selected_office_id: existing.selected_office_id, revision: existing.revision, changed_at: new Date() });
    Object.assign(existing, payload); existing.revision += 1;
    await existing.save({ session }); await notifyHeadOffice(existing, actor.actorId, "requested", session); return existing;
  }
  const [created] = await Requests.create([payload], { session }); await notifyHeadOffice(created, actor.actorId, "requested", session); return created;
}

// Legacy forms send details directly. Convert staff changes into proposals too.
export function enquiryOfficeInput(body: any, camp: any, currentOffice: any) {
  if (body.head_office_request?.operation && body.head_office_request.operation !== "keep") return body.head_office_request;
  if (body.head_office_request?.operation === "keep") return null;
  const hasFields = ["head_office_address", "head_office_contact", "head_office_location", "head_office_details"].some(key => body[key] !== undefined);
  if (!hasFields && !body.selected_head_office_id) return null;
  if (body.selected_head_office_id) return { operation: "link", selected_office_id: body.selected_head_office_id };
  const proposed = officeDetails({ address: body.head_office_address, phone: body.head_office_contact, geo_location: body.head_office_location, other_details: body.head_office_details });
  if (JSON.stringify(proposed) === JSON.stringify(officeDetails(currentOffice))) return null;
  return { operation: Object.values(proposed).some(Boolean) ? camp?.headoffice_id ? "edit" : "create" : "remove", office_id: id(camp?.headoffice_id), proposed };
}

export async function reviewOfficeRequest(actor: EnquiryActor, requestId: string, body: any, session: mongoose.ClientSession) {
  const request: any = await Requests.findById(requestId).session(session);
  if (!request || !canAdministerEnquiry(request, actor)) return fail(403, "You cannot review this request");
  if (request.status !== "pending" || request.revision !== Number(body.revision)) return fail(409, "This request has changed or was already reviewed");
  if (!["approve", "reject"].includes(body.decision)) return fail(400, "Invalid review decision");
  if (body.decision === "reject" && !String(body.note || "").trim()) return fail(400, "Enter a rejection reason");
  const businessId = id(request.business_id);
  if (body.decision === "approve") {
    const camps = [];
    for (const before of request.before_links) {
      const camp = await campInBusiness(before.camp_id, businessId, session);
      if (id(camp.headoffice_id) !== id(before.office_id)) return fail(409, "A facility link changed since submission. Ask staff to revise the request");
      camps.push(camp);
    }
    if (request.enquiry_id) {
      const enquiry: any = await Enquiries.findById(request.enquiry_id).session(session).lean();
      if (!enquiry || id(enquiry.business_id) !== businessId || !camps.some(camp => id(camp) === id(enquiry.camp_id))) return fail(409, "The enquiry facility has changed. Revise the request");
    }
    let officeId: any = null;
    if (body.match_office_id || request.operation === "link") {
      officeId = (await officeInBusiness(body.match_office_id || request.selected_office_id, businessId, session))._id;
      if (body.match_office_id && request.operation !== "create") return fail(400, "Only a new office request can be matched to an existing office");
    } else if (request.operation === "create" || (request.operation === "edit" && body.resolution === "separate")) {
      if (request.operation === "edit" && !camps.length) return fail(400, "Choose target facilities before creating a separate office");
      if (request.operation === "edit") {
        const office = await officeInBusiness(request.office_id, businessId, session);
        if (JSON.stringify(officeDetails(office)) !== JSON.stringify(request.before_office)) return fail(409, "Head office details changed since submission");
      }
      const [office] = await Offices.create([{ ...request.proposed, business_id: businessId, created_by: request.requested_by, createdBy: request.requested_by }], { session });
      officeId = office._id;
    } else if (request.operation === "edit") {
      if (body.resolution !== "shared") return fail(400, "Choose whether to update the shared office or create a separate office");
      const office = await officeInBusiness(request.office_id, businessId, session);
      if (JSON.stringify(officeDetails(office)) !== JSON.stringify(request.before_office)) return fail(409, "Head office details changed since submission");
      await Offices.updateOne({ _id: office._id }, { $set: request.proposed }, { session }); officeId = office._id;
    }
    if (request.camp_ids.length) await Camps.updateMany({ _id: { $in: request.camp_ids } }, { $set: { headoffice_id: officeId } }, { session });
    if (request.detach_camp_ids?.length) await Camps.updateMany({ _id: { $in: request.detach_camp_ids } }, { $set: { headoffice_id: null } }, { session });
    request.approved_office_id = officeId;
    request.resolution = body.match_office_id ? "matched" : body.resolution || request.operation;
  }
  request.status = body.decision === "approve" ? "approved" : "rejected";
  request.reviewed_by = actor.actorId; request.reviewed_at = new Date(); request.review_note = String(body.note || "").trim();
  await request.save({ session }); await notifyHeadOffice(request, actor.actorId, request.status, session); return request;
}

export async function authorizeOfficeAdministration(req: Request, actor: EnquiryActor | null, body: any) {
  if (!actor) return fail(401, "Unauthorized");
  const { businessId } = await requestBusiness(req, actor, { business_id: body.business_id });
  if (!canAdministerEnquiry({ business_id: businessId }, actor)) return fail(403, "Head office changes must be submitted for admin approval");
  if (body.head_office_id) await officeInBusiness(body.head_office_id, businessId);
  for (const campId of body.camp_ids || []) await campInBusiness(campId, businessId);
  return businessId;
}
