import mongoose from "mongoose";
import Tasks from "@/models/business_tasks.model";
import Events from "@/models/calendar_events.model";
import Histories from "@/models/eq_enquiry_histories";
import Enquiries from "@/models/eq_enquiries.model";
import Users from "@/models/users.model";
import Teams from "@/models/project_team.model";
import { actionHistoryFilter } from "@/lib/enquiries/completion";

export class CalendarQueryError extends Error {}
export function parseCalendarPage(params: URLSearchParams) {
  const limit = Number(params.get("limit") || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new CalendarQueryError("Calendar page size must be 1–200");
  const raw = params.get("cursor");
  let cursor: { start: Date; key: string } | undefined;
  if (raw) {
    try {
      if (raw.length > 300) throw new Error();
      const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
      if (!/^\d{4}-\d\d-\d\dT/.test(value.start) || !Number.isFinite(+new Date(value.start)) || !/^(task|custom|enquiry)-[a-f0-9]{24}$/.test(value.key)) throw new Error();
      cursor = { start: new Date(value.start), key: value.key };
    } catch { throw new CalendarQueryError("Invalid calendar cursor"); }
  }
  return { limit, cursor };
}
// Aggregations don't perform Mongoose query casting.
const castIds = (value: any): any => {
  if (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) return new mongoose.Types.ObjectId(value);
  if (value instanceof Date || value instanceof mongoose.Types.ObjectId || value == null) return value;
  if (Array.isArray(value)) return value.map(castIds);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, castIds(item)]));
  return value;
};
const join = (from: string, localField: string, as: string, fields: Record<string, number>) => ({ $lookup: { from, localField, foreignField: "_id", pipeline: [{ $project: fields }], as } });
const text = (field: string) => ({ $ifNull: [field, ""] });
const names = (field: string, name: string) => ({ $reduce: { input: { $ifNull: [field, []] }, initialValue: "", in: { $concat: ["$$value", " ", { $ifNull: [`$$this.${name}`, ""] }] } } });
const pending = (field: any) => ({ $not: [{ $in: [{ $toLower: text(field) }, ["completed", "cancelled", "closed"]] }] });
export async function calendarFeedPage(options: {
  taskQuery: any; eventQuery: any; userId: string; start: Date; end: Date;
  includeTasks: boolean; includeEnquiries: boolean; includeCustomEvents: boolean;
  search: string; page: ReturnType<typeof parseCalendarPage>;
}) {
  const actorId = new mongoose.Types.ObjectId(options.userId);
  const literal = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchStages = (fields: any[]) => options.search ? [{ $match: { $expr: { $regexMatch: { input: { $concat: fields.flatMap((field, index) => index ? [" ", field] : [field]) }, regex: literal, options: "i" } } } }] : [];
  const finish = (kind: string, start: any, end: any, fields: string[], isPending: any) => [{ $project: {
    ...Object.fromEntries(fields.map(field => [field, 1])), _kind: { $literal: kind }, _start: start, _end: end,
    _key: { $concat: [kind === "legacy" ? "enquiry-" : `${kind}-`, { $toString: "$_id" }] }, _pending: isPending,
  } }];
  const pipelines: Array<{ coll: string; pipeline: any[] }> = [];
  if (options.includeTasks) {
    const pipeline: any[] = [{ $match: castIds(options.taskQuery) }];
    if (options.search) pipeline.push(join(Users.collection.name, "assigned_to", "_assignee", { name: 1 }), join(Users.collection.name, "creator", "_creator", { name: 1 }), join(Teams.collection.name, "assigned_teams", "_teams", { team_name: 1 }),
      ...searchStages([text("$task_name"), text("$task_description"), names("$_assignee", "name"), names("$_teams", "team_name"), names("$_creator", "name")]));
    pipeline.push(...finish("task", "$start_date", "$end_date", ["task_name", "task_description", "status", "assigned_to", "assigned_teams", "creator", "is_project_task"], pending("$status")));
    pipelines.push({ coll: Tasks.collection.name, pipeline });
  }
  if (options.includeEnquiries) {
    const history: any[] = [{ $match: { ...actionHistoryFilter, assigned_to: actorId, enquiry_id: { $ne: null }, createdAt: { $lte: options.end } } },
      { $match: { $expr: { $and: [{ $gte: [{ $ifNull: ["$next_step_date", "$createdAt"] }, options.start] },
        { $eq: [{ $ifNull: [{ $getField: { field: "status", input: { $arrayElemAt: [{ $filter: { input: { $ifNull: ["$action_assignments", []] }, as: "part", cond: { $eq: ["$$part.user_id", actorId] } } }, 0] } } }, "pending"] }, "pending"] },
      ] } } }];
    const legacy: any[] = [{ $match: { createdBy: actorId, next_action: { $in: ["Call", "Visit"] }, createdAt: { $lte: options.end } } },
      { $match: { $expr: { $gte: [{ $ifNull: ["$next_action_due", "$createdAt"] }, options.start] } } },
      { $lookup: { from: Histories.collection.name, localField: "_id", foreignField: "enquiry_id", pipeline: [{ $match: { ...actionHistoryFilter, action_origin: "initial" } }, { $limit: 1 }, { $project: { _id: 1 } }], as: "_initial" } },
      { $match: { "_initial.0": { $exists: false } } },
      { $set: { enquiry_id: "$_id", assigned_to: ["$createdBy"], forwarded_by: "$createdBy", action: "$next_action", next_step_date: "$next_action_due", feedback: "" } }];
    for (const [kind, pipeline] of [["enquiry", history], ["legacy", legacy]] as const) {
      pipeline.push(join(Enquiries.collection.name, "enquiry_id", "_enquiry", { enquiry_uuid: 1, next_action: 1, status: 1 }));
      if (options.search) pipeline.push(join(Users.collection.name, "assigned_to", "_assignee", { name: 1 }), join(Users.collection.name, "forwarded_by", "_creator", { name: 1 }),
        ...searchStages([{ $concat: ["Enquiry Action: ", text("$action")] }, text("$feedback"), names("$_enquiry", "next_action"), names("$_enquiry", "enquiry_uuid"), names("$_assignee", "name"), names("$_creator", "name")]));
      pipeline.push(...finish(kind, "$createdAt", { $ifNull: ["$next_step_date", "$createdAt"] }, ["enquiry_id", "camp_id", "assigned_to", "forwarded_by", "action", "feedback", "priority"], pending({ $arrayElemAt: ["$_enquiry.status", 0] })));
      pipelines.push({ coll: kind === "legacy" ? Enquiries.collection.name : Histories.collection.name, pipeline });
    }
  }
  if (options.includeCustomEvents) {
    const pipeline: any[] = [{ $match: castIds(options.eventQuery) }];
    if (options.search) pipeline.push(join(Users.collection.name, "created_by", "_creator", { name: 1 }), join(Users.collection.name, "attendee_ids", "_attendees", { name: 1 }),
      ...searchStages([text("$title"), text("$description"), names("$_creator", "name"), names("$_attendees", "name")]));
    pipeline.push(...finish("custom", "$start_date", "$end_date", ["title", "description", "status", "created_by", "attendee_ids"], pending("$status")));
    pipelines.push({ coll: Events.collection.name, pipeline });
  }
  const summary = { total: 0, tasks: 0, enquiries: 0, customEvents: 0, pending: 0 };
  if (!pipelines.length) return { entries: [], summary, pagination: { limit: options.page.limit, nextCursor: null } };
  const first = pipelines.shift()!;
  const cursorStages = options.page.cursor ? [{ $match: { $or: [{ _start: { $gt: options.page.cursor.start } }, { _start: options.page.cursor.start, _key: { $gt: options.page.cursor.key } }] } }] : [];
  const [result] = await mongoose.connection.db!.collection(first.coll).aggregate([
    ...first.pipeline, ...pipelines.map(part => ({ $unionWith: part })),
    { $facet: { counts: [{ $group: { _id: "$_kind", count: { $sum: 1 }, pending: { $sum: { $cond: ["$_pending", 1, 0] } } } }],
      entries: [...cursorStages, { $sort: { _start: 1, _key: 1 } }, { $limit: options.page.limit + 1 }],
    } },
  ], { allowDiskUse: true }).toArray();
  for (const row of result.counts) { summary.total += row.count; summary.pending += row.pending; summary[row._id === "task" ? "tasks" : row._id === "custom" ? "customEvents" : "enquiries"] += row.count; }
  const hasNext = result.entries.length > options.page.limit;
  const entries = result.entries.slice(0, options.page.limit);
  const last = entries.at(-1);
  return { entries, summary, pagination: { limit: options.page.limit, nextCursor: hasNext && last ? Buffer.from(JSON.stringify({ start: last._start.toISOString(), key: last._key })).toString("base64url") : null } };
}
