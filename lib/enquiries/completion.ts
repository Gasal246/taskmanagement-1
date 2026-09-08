// Shared by API filtering, permissions, and the enquiry UI.
export const forwardHistoryFilter = {
  $or: [{ change_type: "FORWARD" }, { change_type: { $exists: false } }, { change_type: null }],
  action: { $nin: ["Closed", "Finished", "Enquiry Edited"] },
};
export const historyOrder = { step_number: -1, createdAt: -1, _id: -1 } as const;
export const idOf = (value: any): string => String(value?._id ?? value ?? "");
export const isCompleted = (enquiry: any): boolean => Boolean(enquiry?.is_completed || enquiry?.status === "Project Awarded" || enquiry?.status === "Closed" || enquiry?.is_converted);
export const isAwarded = (enquiry: any): boolean => Boolean(enquiry?.is_converted || enquiry?.status === "Project Awarded" || ["awarded", "converted"].includes(enquiry?.completion_source));
export const isManuallyClosed = (enquiry: any): boolean => isCompleted(enquiry) && !isAwarded(enquiry);
export function completionPermissions(enquiry: any, forward: any, actorId: string, admin: boolean) {
  const assigned = Array.isArray(forward?.assigned_to) ? forward.assigned_to : [forward?.assigned_to];
  const eligible = admin || idOf(enquiry?.createdBy) === actorId || assigned.some((user: any) => idOf(user) === actorId);
  return {
    canComplete: Boolean(actorId && eligible && enquiry?.is_active && !isCompleted(enquiry)),
    completionEligible: Boolean(actorId && eligible && !isCompleted(enquiry)),
    canReopen: Boolean(admin && isManuallyClosed(enquiry)),
  };
}
export const completedExpression = { $or: [
  { $eq: ["$is_completed", true] }, { $in: ["$status", ["Closed", "Project Awarded"]] }, { $eq: ["$is_converted", true] },
] };
export function completionFilterStages(params: Record<string, any>): any[] {
  const state = params.completion_state || "all";
  if (!["all", "completed", "non_completed"].includes(state)) throw new Error("Invalid completion filter");
  const from = params.period_from ? new Date(params.period_from) : null;
  const to = params.period_to ? new Date(params.period_to) : null;
  if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) || (from && to && from > to)) throw new Error("Invalid period range");
  const match: any = {};
  if (state !== "all") match.completion_resolved = state === "completed";
  if (from || to) match.completion_period_date = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  return [
    { $addFields: { completion_resolved: completedExpression, completion_period_date: { $cond: [completedExpression, { $ifNull: ["$completed_at", "$updatedAt"] }, "$updatedAt"] } } },
    { $match: match },
  ];
}
export function matchesCompletionPeriod(enquiry: any, params: Record<string, any>): boolean {
  completionFilterStages(params); // Use identical validation for both list implementations.
  const completed = isCompleted(enquiry);
  if (params.completion_state === "completed" && !completed) return false;
  if (params.completion_state === "non_completed" && completed) return false;
  const date = new Date(completed ? enquiry.completed_at || enquiry.updatedAt : enquiry.updatedAt).getTime();
  if (params.period_from && !(date >= new Date(params.period_from).getTime())) return false;
  if (params.period_to && !(date < new Date(params.period_to).getTime())) return false;
  return true;
}
