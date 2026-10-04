import mongoose from "mongoose";
import Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import Skills from "@/models/business_skills.model";
import { escapeSearch, pageBounds } from "@/lib/search";

export async function taskActivityPage(visibleQuery: any, params: URLSearchParams) {
  const bounds = pageBounds(params, 25, 100);
  const search = (params.get("activitySearch") || "").trim();
  const status = params.get("activityStatus") || "";
  if (status && !["pending", "completed"].includes(status)) throw new Error("Invalid activity status");
  const focusId = params.get("activityId");
  if (focusId && !mongoose.isValidObjectId(focusId)) throw new Error("Invalid activity ID");
  const cast = (value: any): any => Array.isArray(value) ? value.map(cast) : value && typeof value === "object" && !(value instanceof mongoose.Types.ObjectId)
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cast(entry)]))
    : typeof value === "string" && mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : value;
  const visible = cast(visibleQuery);
  const filters: any[] = [];
  if (status) filters.push({ $match: { is_done: status === "completed" ? true : { $ne: true } } });
  if (search) {
    const regex = new RegExp(escapeSearch(search), "i");
    filters.push(
      { $lookup: { from: Users.collection.name, localField: "assigned_to", foreignField: "_id", pipeline: [{ $project: { name: 1 } }], as: "_assignee" } },
      { $lookup: { from: Skills.collection.name, localField: "assigned_skill", foreignField: "_id", pipeline: [{ $project: { skill_name: 1 } }], as: "_skill" } },
      { $match: { $or: [{ activity: regex }, { description: regex }, { "_assignee.name": regex }, { "_skill.skill_name": regex }] } },
    );
  }
  let requestedPage = bounds.page;
  let focusFound: boolean | undefined;
  if (focusId && !search && !status) {
    const focus: any = await Activities.findOne({ ...visibleQuery, _id: focusId }).select("updatedAt").lean();
    focusFound = Boolean(focus);
    if (focus) {
      const before = await Activities.countDocuments({ $and: [visibleQuery, { $or: [
        { updatedAt: { $gt: focus.updatedAt } }, { updatedAt: focus.updatedAt, _id: { $gt: focus._id } },
      ] }] });
      requestedPage = Math.floor(before / bounds.limit) + 1;
    }
  }
  const order: any[] = [{ $sort: { updatedAt: -1, _id: -1 } }];
  const records = (skip: number) => [...filters, { $skip: skip }, { $limit: bounds.limit }, { $project: { _id: 1 } }];
  const [result] = await Activities.aggregate([
    { $match: visible },
    ...order,
    { $project: { _id: 1, updatedAt: 1, is_done: 1, activity: 1, description: 1, assigned_to: 1, assigned_skill: 1 } },
    { $facet: {
      summary: [{ $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$is_done", true] }, 1, 0] } } } }],
      matching: [...filters, { $count: "total" }],
      records: records((requestedPage - 1) * bounds.limit),
    } },
  ]);
  const summary = result.summary[0] || { total: 0, completed: 0 };
  const total = result.matching[0]?.total || 0;
  const pages = Math.max(1, Math.ceil(total / bounds.limit));
  const page = Math.min(requestedPage, pages);
  const ids = page === requestedPage ? result.records : await Activities.aggregate([{ $match: visible }, ...order, ...records((page - 1) * bounds.limit)]);
  return {
    ids: ids.map((row: any) => row._id),
    pagination: { page, limit: bounds.limit, total, pages, focusFound },
    summary: { total: summary.total, completed: summary.completed, pending: summary.total - summary.completed },
  };
}
