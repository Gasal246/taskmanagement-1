import mongoose from "mongoose";
import Histories from "@/models/eq_enquiry_histories";
import Access from "@/models/eq_enquiry_access.model";
import Enquiries from "@/models/eq_enquiries.model";
import "@/models/eq_camps.model";
import { pageBounds } from "@/lib/search";
import { hydrateChangedFieldNames } from "@/lib/enquiry-history-resolver";

const lifecycle = ["ENQUIRY_COMPLETED", "ENQUIRY_REOPENED", "ACTION_COMPLETED", "ACTION_CANCELLED", "ACTION_REOPENED"];
export async function enquiryHistoryPage(enquiryId: string, params: URLSearchParams, userId?: string) {
  const bounds = pageBounds(params, 25, 100);
  const kind = params.get("kind") || "all";
  if (!["all", "forwards", "updates", "completion"].includes(kind)) throw new Error("Invalid history filter");
  const match: any = { enquiry_id: new mongoose.Types.ObjectId(enquiryId) };
  const asOf = params.get("asOf");
  if (asOf) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(asOf) || !Number.isFinite(Date.parse(asOf))) throw new Error("Invalid history timestamp");
    match.createdAt = { $lte: new Date(asOf) };
  }
  if (kind === "updates") match.change_type = "ENQUIRY_EDIT";
  if (kind === "completion") match.change_type = { $in: lifecycle };
  if (kind === "forwards") match.change_type = { $nin: ["ENQUIRY_EDIT", ...lifecycle] };
  const visibility: any[] = userId ? [
    { $lookup: { from: Access.collection.name, localField: "_id", foreignField: "history_id", pipeline: [
      { $match: { enquiry_id: new mongoose.Types.ObjectId(enquiryId), user_id: new mongoose.Types.ObjectId(userId) } },
      { $limit: 1 }, { $project: { _id: 1 } },
    ], as: "_access" } },
    { $match: { "_access.0": { $exists: true } } },
  ] : [];
  const base: any[] = [{ $match: match }, ...visibility];
  const [counts, enquiry] = await Promise.all([
    Histories.aggregate([...base, { $count: "total" }]),
    Enquiries.findById(enquiryId).select("enquiry_uuid camp_id").populate("camp_id", "camp_name").lean(),
  ]);
  const [count] = counts;
  const total = count?.total || 0;
  const pages = Math.max(1, Math.ceil(total / bounds.limit));
  const page = Math.min(bounds.page, pages);
  const ids = await Histories.aggregate([{ $match: match }, { $sort: { step_number: -1, createdAt: -1, _id: -1 } }, ...visibility,
    { $skip: (page - 1) * bounds.limit }, { $limit: bounds.limit }, { $project: { _id: 1 } }]);
  const histories = await Histories.find({ _id: { $in: ids.map(row => row._id) } }).sort({ step_number: -1, createdAt: -1, _id: -1 }).populate([
    { path: "action_assignee", select: "name email" }, { path: "action_assignments.user_id", select: "name email" },
    { path: "assigned_to", select: "name email" }, { path: "forwarded_by", select: "name email avatar_url" },
    { path: "changed_by", select: "name email avatar_url" },
  ]).lean();
  await hydrateChangedFieldNames(histories, entry => entry);
  // Keep the legacy staff response shape, with one row per visible history.
  return { histories: userId ? histories.map(history => ({ _id: history._id, history_id: history })) : histories,
    enquiry, pagination: { page, limit: bounds.limit, total, pages }, status: 200 };
}
