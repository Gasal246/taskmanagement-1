import mongoose from "mongoose";
import { auth } from "@/auth";
import Enquiries from "@/models/eq_enquiries.model";
import Histories from "@/models/eq_enquiry_histories";
import Access from "@/models/eq_enquiry_access.model";
import Admins from "@/models/admin_assign_business.model";
import Staff from "@/models/business_staffs.model";
import Business from "@/models/business.model";
import UserRoles from "@/models/user_roles.model";
import EqUsers from "@/models/eq_enquiry_users.model";
import "@/models/roles.model";
import { NextResponse } from "next/server";
import { actionHistoryFilter, idOf } from "./completion";

export type EnquiryActor = { actorId: string; admin: boolean; isSuper?: boolean; adminBusinessIds?: string[] };
export async function enquiryActor(): Promise<EnquiryActor | null> {
  const session = await auth();
  const actorId = idOf(session?.user?.id);
  if (!mongoose.isValidObjectId(actorId)) return null;
  const isSuper = Boolean(session?.user?.is_super);
  const [assigned, roles] = await Promise.all([
    Admins.find({ user_id: actorId, status: 1 }).distinct("business_id"),
    UserRoles.find({ user_id: actorId, status: 1 }).populate("role_id", "role_name").lean(),
  ]);
  const granted = assigned.filter(businessId => roles.some((row: any) => row.role_id?.role_name === "BUSINESS_ADMIN" && (!row.business_id || String(row.business_id) === String(businessId))));
  const active = await Business.find({ _id: { $in: granted }, status: 1 }).distinct("_id");
  const adminBusinessIds = active.map(String);
  return { actorId, isSuper, adminBusinessIds, admin: isSuper || adminBusinessIds.length > 0 };
}

// A broad role flag never substitutes for ownership of this enquiry.
export function canAdministerEnquiry(enquiry: any, actor: EnquiryActor): boolean {
  return Boolean(actor.isSuper || (enquiry.business_id && actor.adminBusinessIds?.includes(idOf(enquiry.business_id))));
}
export function enquiryManagementFilter(actor: EnquiryActor) {
  return actor.isSuper ? {} : { business_id: { $in: (actor.adminBusinessIds || []).map(id => new mongoose.Types.ObjectId(id)) } };
}
export async function canReadEnquiry(enquiry: any, actor: EnquiryActor) {
  if (canAdministerEnquiry(enquiry, actor) || idOf(enquiry.createdBy) === actor.actorId || (enquiry.enquiry_brought_by || []).some((id: any) => idOf(id) === actor.actorId)) return true;
  const [shared, assigned] = await Promise.all([
    Access.exists({ enquiry_id: enquiry._id, user_id: actor.actorId }),
    Histories.exists({ enquiry_id: enquiry._id, assigned_to: actor.actorId, ...actionHistoryFilter }),
  ]);
  return Boolean(shared || assigned);
}
export async function canScheduleAction(enquiry: any, actor: EnquiryActor) {
  if (canAdministerEnquiry(enquiry, actor) || idOf(enquiry.createdBy) === actor.actorId) return true;
  return Boolean(await Histories.exists({ enquiry_id: enquiry._id, assigned_to: actor.actorId, ...actionHistoryFilter }));
}
export async function canEditEnquiry(enquiry: any, actor: EnquiryActor) {
  return canAdministerEnquiry(enquiry, actor) || (enquiry.enquiry_brought_by || []).some((id: any) => idOf(id) === actor.actorId) || await canScheduleAction(enquiry, actor);
}

// Editing a shared enquiry does not confer ownership of its directory Facility.
export async function canChangeEnquiryFacility(enquiry: any, camp: any, actor: EnquiryActor, session?: mongoose.ClientSession) {
  if (actor.isSuper) return true;
  const businessId = idOf(enquiry.business_id);
  if (!businessId || (camp.business_id && idOf(camp.business_id) !== businessId)) return false;
  const foreign = await Enquiries.exists({ camp_id: camp._id, _id: { $ne: enquiry._id }, business_id: { $ne: businessId } }).session(session || null);
  return !foreign;
}

export async function authorizeEnquiry(enquiryId: unknown, permission: "read" | "edit" | "admin" = "read") {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (typeof enquiryId !== "string" || !mongoose.isValidObjectId(enquiryId)) return NextResponse.json({ message: "Provide a valid enquiry ID" }, { status: 400 });
  const enquiry: any = await Enquiries.findById(enquiryId).select("business_id createdBy enquiry_brought_by camp_id").lean();
  if (!enquiry) return NextResponse.json({ message: "Enquiry not found" }, { status: 404 });
  const allowed = permission === "admin" ? canAdministerEnquiry(enquiry, actor) : permission === "edit" ? await canEditEnquiry(enquiry, actor) : await canReadEnquiry(enquiry, actor);
  return allowed ? null : NextResponse.json({ message: "You cannot access this enquiry" }, { status: 403 });
}

export async function resolveEnquiryCreationBusiness(req: Request, actor: EnquiryActor, hint?: unknown) {
  const [staff, eqUsers, agents] = await Promise.all([
    Staff.find({ user_id: actor.actorId, status: 1 }).distinct("business_id"),
    EqUsers.find({ user_id: actor.actorId }).distinct("business_id"),
    UserRoles.find({ user_id: actor.actorId, status: 1 }).populate("role_id", "role_name").lean(),
  ]);
  const candidateIds = [...new Set([...staff, ...eqUsers, ...(actor.adminBusinessIds || []), ...agents.filter((row: any) => row.role_id?.role_name === "AGENT").map((row: any) => row.business_id)].filter(Boolean).map(String))];
  const active = new Set((await Business.find({ _id: { $in: candidateIds }, status: 1 }).distinct("_id")).map(String));
  let selected = typeof hint === "string" ? hint : "";
  if (!selected) {
    try {
      const cookie = req.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith("user_domain="))?.slice("user_domain=".length);
      if (cookie) { const domain = JSON.parse(decodeURIComponent(cookie)); selected = String(domain.business_id || domain.business?._id || (actor.adminBusinessIds?.includes(String(domain.value)) ? domain.value : "") || ""); }
    } catch { /* Ignore malformed selection; persisted memberships still decide access. */ }
  }
  if (!selected && active.size === 1) selected = [...active][0];
  if (!mongoose.isValidObjectId(selected)) return null;
  if (actor.isSuper) return await Business.exists({ _id: selected, status: 1 }) ? selected : null;
  return active.has(selected) ? selected : null;
}

// Legacy contact routes identify a facility instead of an enquiry. Bind new
// contacts to an authorized enquiry and check the stored parent on later writes.
export async function editableEnquiryForCamp(campId: unknown, actor: EnquiryActor) {
  if (typeof campId !== "string" || !mongoose.isValidObjectId(campId)) return null;
  const managed: any = await Enquiries.findOne({ camp_id: campId, ...enquiryManagementFilter(actor) }).select("_id camp_id").lean();
  if (managed && actor.admin) return managed;
  const own: any = await Enquiries.findOne({ camp_id: campId, $or: [{ createdBy: actor.actorId }, { enquiry_brought_by: actor.actorId }] }).select("_id camp_id").lean();
  if (own) return own;
  const assignedIds = await Histories.find({ camp_id: campId, assigned_to: actor.actorId, ...actionHistoryFilter }).distinct("enquiry_id");
  return Enquiries.findOne({ camp_id: campId, _id: { $in: assignedIds } }).select("_id camp_id").lean();
}

export async function authorizeEnquiryBusiness(businessId: unknown, manage = false) {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (typeof businessId !== "string" || !mongoose.isValidObjectId(businessId)) return NextResponse.json({ message: "Provide a valid business ID" }, { status: 400 });
  if (actor.isSuper || actor.adminBusinessIds?.includes(businessId)) return null;
  if (!manage) {
    const [staff, member, agent] = await Promise.all([
      Staff.exists({ user_id: actor.actorId, business_id: businessId, status: 1 }),
      EqUsers.exists({ user_id: actor.actorId, business_id: businessId }),
      UserRoles.find({ user_id: actor.actorId, business_id: businessId, status: 1 }).populate("role_id", "role_name").lean(),
    ]);
    if (staff || member || agent.some((row: any) => row.role_id?.role_name === "AGENT")) return null;
  }
  return NextResponse.json({ message: "You cannot access this business" }, { status: 403 });
}

export function enquiryVisibilityStages(actor: EnquiryActor): any[] {
  if (actor.isSuper) return [];
  const userId = new mongoose.Types.ObjectId(actor.actorId);
  return [
    { $lookup: { from: Access.collection.name, localField: "_id", foreignField: "enquiry_id", pipeline: [{ $match: { user_id: userId } }, { $limit: 1 }, { $project: { _id: 1 } }], as: "_recordAccess" } },
    { $lookup: { from: Histories.collection.name, localField: "_id", foreignField: "enquiry_id", pipeline: [{ $match: { assigned_to: userId, ...actionHistoryFilter } }, { $limit: 1 }, { $project: { _id: 1 } }], as: "_recordAssignment" } },
    { $match: { $or: [enquiryManagementFilter(actor), { createdBy: userId }, { enquiry_brought_by: userId }, { "_recordAccess.0": { $exists: true } }, { "_recordAssignment.0": { $exists: true } }] } },
    { $unset: ["_recordAccess", "_recordAssignment"] },
  ];
}
export async function countReadableEnquiries(filter: Record<string, any>, actor: EnquiryActor) {
  const cast = Object.fromEntries(Object.entries(filter).map(([key, value]) => [key, mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : value]));
  const [count] = await Enquiries.aggregate([{ $match: cast }, ...enquiryVisibilityStages(actor), { $count: "total" }]);
  return count?.total || 0;
}
export async function authorizeCampMutation(campId: unknown) {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (typeof campId !== "string" || !mongoose.isValidObjectId(campId)) return NextResponse.json({ message: "Provide a valid Facility ID" }, { status: 400 });
  if (actor.isSuper) return null;
  if (!actor.admin) return NextResponse.json({ message: "Facility management requires an administrator" }, { status: 403 });
  if (await Enquiries.exists({ camp_id: campId, $nor: [enquiryManagementFilter(actor)] })) return NextResponse.json({ message: "This Facility has another business’s enquiries or needs ownership review" }, { status: 403 });
  const Camps = (await import("@/models/eq_camps.model")).default;
  const [owned, linked] = await Promise.all([
    Camps.exists({ _id: campId, business_id: { $in: actor.adminBusinessIds || [] } }),
    Enquiries.exists({ camp_id: campId, ...enquiryManagementFilter(actor) }),
  ]);
  return owned || linked ? null : NextResponse.json({ message: "Shared catalogue Facilities require a superadmin to change or remove" }, { status: 403 });
}

export async function authorizeAreaMutation(areaId: unknown) {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (typeof areaId !== "string" || !mongoose.isValidObjectId(areaId)) return NextResponse.json({ message: "Provide a valid area ID" }, { status: 400 });
  if (actor.isSuper) return null;
  if (!actor.admin || await Enquiries.exists({ area_id: areaId, $nor: [enquiryManagementFilter(actor)] })) return NextResponse.json({ message: "You cannot activate or change another business’s enquiry area" }, { status: 403 });
  const Areas = (await import("@/models/eq_area.model")).default;
  const [owned, linked] = await Promise.all([
    Areas.exists({ _id: areaId, business_id: { $in: actor.adminBusinessIds || [] } }),
    Enquiries.exists({ area_id: areaId, ...enquiryManagementFilter(actor) }),
  ]);
  return owned || linked ? null : NextResponse.json({ message: "Shared catalogue areas require a superadmin to change" }, { status: 403 });
}
