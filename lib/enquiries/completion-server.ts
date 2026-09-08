import mongoose from "mongoose";
import { auth } from "@/auth";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Histories from "@/models/eq_enquiry_histories";
import Access from "@/models/eq_enquiry_access.model";
import User_roles from "@/models/user_roles.model";
import "@/models/roles.model";
import "@/models/users.model";
import { completionPermissions, forwardHistoryFilter, historyOrder, idOf, isCompleted, completedExpression } from "./completion";

export async function enquiryActor() {
  const session: any = await auth();
  const actorId = idOf(session?.user?.id);
  if (!actorId) return null;
  const roles = await User_roles.find({ user_id: actorId, status: 1 }).populate({ path: "role_id", select: "role_name" }).lean();
  return { actorId, admin: Boolean(session?.user?.is_super || roles.some((r: any) => r.role_id?.role_name === "BUSINESS_ADMIN")) };
}
export type EnquiryActor = NonNullable<Awaited<ReturnType<typeof enquiryActor>>>;
export async function canReadEnquiry(enquiry: any, actor: EnquiryActor) {
  if (actor.admin || idOf(enquiry.createdBy) === actor.actorId || (enquiry.enquiry_brought_by || []).some((id: any) => idOf(id) === actor.actorId)) return true;
  if (await Access.exists({ enquiry_id: enquiry._id, user_id: actor.actorId })) return true;
  const forward: any = await Histories.findOne({ enquiry_id: enquiry._id, ...forwardHistoryFilter }).sort(historyOrder).select("assigned_to").lean();
  return (forward?.assigned_to || []).some((id: any) => idOf(id) === actor.actorId);
}
export async function enrichEnquiries(entries: any[], actor: EnquiryActor) {
  if (!entries.length) return entries;
  const histories = await Histories.aggregate([
    { $match: { enquiry_id: { $in: entries.map(e => new mongoose.Types.ObjectId(idOf(e))) }, ...forwardHistoryFilter } },
    { $sort: historyOrder },
    { $group: { _id: "$enquiry_id", history: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$history" } },
  ]);
  await Histories.populate(histories, [{ path: "assigned_to", select: "name email" }, { path: "forwarded_by", select: "name email" }]);
  const forwards = new Map<string, any>();
  for (const history of histories as any[]) if (!forwards.has(idOf(history.enquiry_id))) forwards.set(idOf(history.enquiry_id), history);
  await Eq_enquiry.populate(entries, { path: "completed_by", select: "name email" });
  return entries.map(entry => ({ ...entry, completion_resolved: isCompleted(entry),
    completion_date_estimated: entry.completion_date_estimated || (isCompleted(entry) && !entry.completed_at),
    latest_forward: forwards.get(idOf(entry)) ?? null,
    ...completionPermissions(entry, forwards.get(idOf(entry)), actor.actorId, actor.admin),
  }));
}
// Called by award/conversion paths. The first completion timestamp is immutable.
export async function stampAutomaticCompletion(enquiryId: any, actorId: string, source: "awarded" | "converted") {
  const hasDate = { $ne: [{ $ifNull: ["$completed_at", null] }, null] };
  await Eq_enquiry.updateOne({ _id: enquiryId }, [{ $set: {
    completed_at: { $ifNull: ["$completed_at", { $cond: [completedExpression, "$updatedAt", "$$NOW"] }] },
    completed_by: { $cond: [hasDate, "$completed_by", { $cond: [completedExpression, "$$REMOVE", new mongoose.Types.ObjectId(actorId)] }] },
    completion_date_estimated: { $cond: [hasDate, "$completion_date_estimated", completedExpression] },
    is_completed: true, completion_source: source,
  } }]);
}
export class EnquiryRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function transitionEnquiry(body: any, actor: EnquiryActor, reopen = false) {
  if (!mongoose.isValidObjectId(body.enquiry_id)) throw new EnquiryRequestError(400, "Invalid enquiry ID");
  if (typeof body.notes !== "string" || !body.notes.trim() || body.notes.length > 5000) throw new EnquiryRequestError(400, "Add a note of up to 5,000 characters");
  if (!body.expected_updated_at || !Number.isFinite(new Date(body.expected_updated_at).getTime())) throw new EnquiryRequestError(400, "Refresh the enquiry before continuing");
  if (!reopen && (!["Call", "Visit"].includes(body.action) || !("source_forward_id" in body))) throw new EnquiryRequestError(400, "Select Call or Visit in the completion dialog");
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const enquiry: any = await Eq_enquiry.findById(body.enquiry_id).session(dbSession);
      if (!enquiry) throw new EnquiryRequestError(404, "Enquiry not found");
      const forward: any = await Histories.findOne({ enquiry_id: enquiry._id, ...forwardHistoryFilter }).sort(historyOrder).session(dbSession).lean();
      const permissions = completionPermissions(enquiry, forward, actor.actorId, actor.admin);
      if (reopen ? !permissions.canReopen : !permissions.completionEligible) throw new EnquiryRequestError(isCompleted(enquiry) && !reopen ? 409 : 403, reopen ? "Only admins can reopen a manually completed enquiry" : "This enquiry is already completed or you cannot complete it");
      if (!reopen && !enquiry.is_active) throw new EnquiryRequestError(403, "Admin approval is required before completion");
      if (new Date(body.expected_updated_at).getTime() !== new Date(enquiry.updatedAt).getTime() || (!reopen && idOf(body.source_forward_id) !== idOf(forward))) throw new EnquiryRequestError(409, "The enquiry has changed. Close this dialog and review the latest action again.");
      const latest: any = await Histories.findOne({ enquiry_id: enquiry._id }).sort(historyOrder).session(dbSession).lean();
      const oldAction = forward?.action || "";
      if (reopen) {
        if (enquiry.status === "Closed") {
          const edits: any[] = await Histories.find({ enquiry_id: enquiry._id, "changed_fields.field": "status" }).sort(historyOrder).session(dbSession).lean();
          const statuses = edits.flatMap(h => h.changed_fields.filter((f: any) => f.field === "status").flatMap((f: any) => [f.to_value, f.from_value]));
          enquiry.status = statuses.find(s => typeof s === "string" && s && !["Closed", "Project Awarded"].includes(s)) || "Lead Received";
        }
        enquiry.is_completed = false;
        for (const key of ["completed_at", "completed_by", "completion_action", "completion_notes", "completion_source", "completion_forward_id", "completion_date_estimated"]) enquiry.set(key, undefined);
      } else {
        enquiry.is_completed = true;
        enquiry.completed_at = new Date();
        enquiry.completed_by = actor.actorId;
        enquiry.completion_action = body.action;
        enquiry.completion_notes = body.notes.trim();
        enquiry.completion_source = "manual";
        enquiry.completion_forward_id = forward?._id ?? null;
        enquiry.completion_date_estimated = false;
      }
      // Updating the same enquiry document serializes competing transitions/forwards.
      await enquiry.save({ session: dbSession });
      const [history] = await Histories.create([{
        enquiry_id: enquiry._id, camp_id: enquiry.camp_id, changed_by: actor.actorId,
        change_type: reopen ? "ENQUIRY_REOPENED" : "ENQUIRY_COMPLETED",
        step_number: Number(latest?.step_number || 0) + 1,
        assigned_to: forward?.assigned_to || [], is_finished: !reopen,
        action: reopen ? "Reopened" : body.action, feedback: body.notes.trim(),
        source_forward_id: forward?._id || null, previous_action: oldAction,
      }], { session: dbSession });
      const access: any[] = await Access.find({ enquiry_id: enquiry._id }).select("user_id").session(dbSession).lean();
      const viewers = new Set([...access.map(a => idOf(a.user_id)), idOf(enquiry.createdBy), actor.actorId, ...(forward?.assigned_to || []).map(idOf)].filter(Boolean));
      await Access.insertMany([...viewers].map(user_id => ({ user_id, enquiry_id: enquiry._id, camp_id: enquiry.camp_id, history_id: history._id })), { session: dbSession });
    });
  } finally { await dbSession.endSession(); }
}
