import mongoose from "mongoose";
import Histories from "@/models/eq_enquiry_histories";
import { actionHistoryFilter, validateActionFilters } from "./completion";

// Match the same legacy + per-assignee rules as matchesActionFilters without
// transferring and populating every candidate's histories in the API process.
export function actionFilterStages(params: Record<string, any>, actorId: string, now = new Date()): any[] {
  validateActionFilters(params);
  const mine = params.action_scope === "mine";
  const state = params.action_state || "all";
  const action = params.next_action && params.next_action !== "all" ? params.next_action : "";
  if (!mine && state === "all" && !action && !params.period_from && !params.period_to) return [];
  const actor = mongoose.isValidObjectId(actorId) ? new mongoose.Types.ObjectId(actorId) : null;
  const array = (value: string) => ({ $cond: [{ $isArray: value }, value, { $cond: [{ $ne: [{ $ifNull: [value, null] }, null] }, [value], []] }] });
  const due = "$$candidate.next_step_date";
  const date = { $switch: { branches: [
    { case: { $eq: ["$$part.status", "completed"] }, then: "$$part.completed_at" },
    { case: { $eq: ["$$part.status", "cancelled"] }, then: "$$part.cancelled_at" },
  ], default: due } };
  const conditions: any[] = [];
  if (state === "overdue") conditions.push({ $eq: ["$$part.status", "pending"] }, { $ne: [{ $ifNull: [due, null] }, null] }, { $lt: [due, now] });
  else if (!["all", "no_action"].includes(state)) conditions.push({ $eq: ["$$part.status", state] });
  if (params.period_from || params.period_to) conditions.push({ $ne: [{ $ifNull: [date, null] }, null] });
  if (params.period_from) conditions.push({ $gte: [date, new Date(params.period_from)] });
  if (params.period_to) conditions.push({ $lt: [date, new Date(params.period_to)] });
  const scopedParts = mine ? { $filter: { input: "$$candidate.parts", as: "part", cond: { $eq: ["$$part.user_id", actor] } } } : {
    $cond: [{ $gt: [{ $size: "$$candidate.parts" }, 0] }, "$$candidate.parts", [{ status: "pending" }]],
  };
  const actionMatches: any = { $anyElementTrue: [{ $map: { input: "$_scopedActions", as: "candidate", in: {
    $and: [
      ...(action ? [{ $eq: ["$$candidate.action", action] }] : []),
      { $anyElementTrue: [{ $map: { input: scopedParts, as: "part", in: conditions.length ? { $and: conditions } : true } }] },
    ],
  } } }] };
  const scoped = mine ? { $filter: { input: "$_normalizedActions", as: "candidate", cond: { $in: [actor, "$$candidate.parts.user_id"] } } } : "$_normalizedActions";
  const predicate = state === "no_action" ? { $eq: [{ $size: "$_scopedActions" }, 0] }
    : mine && state === "all" && !action && !params.period_from && !params.period_to ? { $gt: [{ $size: "$_scopedActions" }, 0] }
    : actionMatches;
  return [
    { $lookup: { from: Histories.collection.name, localField: "_id", foreignField: "enquiry_id", pipeline: [
      { $match: actionHistoryFilter },
      { $project: { action: 1, assigned_to: 1, action_assignments: 1, action_origin: 1, next_step_date: 1 } },
    ], as: "_actionRecords" } },
    { $set: { _actionRecords: { $concatArrays: ["$_actionRecords", { $cond: [
      { $and: [{ $in: ["$next_action", ["Call", "Visit"]] }, { $not: [{ $in: ["initial", "$_actionRecords.action_origin"] }] }] },
      [{ action: "$next_action", assigned_to: { $cond: [{ $ne: [{ $ifNull: ["$createdBy", null] }, null] }, ["$createdBy"], []] }, next_step_date: "$next_action_due" }], [],
    ] }] } } },
    { $set: { _normalizedActions: { $map: { input: "$_actionRecords", as: "candidate", in: {
      action: "$$candidate.action", next_step_date: "$$candidate.next_step_date",
      parts: { $map: { input: { $setUnion: [array("$$candidate.assigned_to"), []] }, as: "assignee", in: { $let: {
        vars: { stored: { $arrayElemAt: [{ $filter: { input: { $ifNull: ["$$candidate.action_assignments", []] }, as: "storedPart", cond: { $eq: ["$$storedPart.user_id", "$$assignee"] } } }, 0] } },
        in: { $ifNull: ["$$stored", { user_id: "$$assignee", status: "pending" }] },
      } } } },
    } } } } },
    { $set: { _scopedActions: scoped } },
    { $match: { $expr: predicate } },
    { $unset: ["_actionRecords", "_normalizedActions", "_scopedActions"] },
  ];
}
