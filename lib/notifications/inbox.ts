import mongoose from "mongoose";
import { createHash } from "node:crypto";
import Notifications from "@/models/notifications.model";
import { NOTIFICATION_RETENTION_MS } from "@/lib/constants";

export const inboxId = (key: string, index: number) => new mongoose.Types.ObjectId(createHash("sha256").update(`${key}:${index}`).digest("hex").slice(0, 24));
export const unreadFilter = (userId: string) => ({ recipient_id: userId, read_at: null, archived_at: null });
export function serializeNotification(item: any) {
  return { id: String(item._id), kind: item.kind || "general", title: item.title, body: item.body,
    data: item.data || {}, meta: item.meta || {}, createdAt: item.createdAt, readAt: item.read_at || null,
    archivedAt: item.archived_at || null, snoozedUntil: item.snoozed_until || null,
    actionRequired: Boolean(item.action_required),
    sender: item.sender_id?._id ? { id: String(item.sender_id._id), name: item.sender_id.name || "", email: item.sender_id.email || "", avatar_url: item.sender_id.avatar_url || "" } : null };
}
export async function changeNotificationState(userId: string, body: any) {
  const operation = body.operation || "read";
  if (!["read", "unread", "archive", "snooze"].includes(operation)) throw Object.assign(new Error("Invalid notification action"), { status: 400 });
  const ids = [...new Set<string>(Array.isArray(body.ids) ? body.ids : [])];
  if (ids.length > 100 || ids.some(value => typeof value !== "string" || !mongoose.isValidObjectId(value))) throw Object.assign(new Error("Invalid notification IDs"), { status: 400 });
  if (body.all && (operation !== "read" || !body.before || !Number.isFinite(Date.parse(body.before)))) throw Object.assign(new Error("Provide the inbox timestamp to mark all read"), { status: 400 });
  if (!body.all && !ids.length) throw Object.assign(new Error("Select a notification"), { status: 400 });
  const now = new Date();
  const filter: any = { recipient_id: userId, archived_at: null, ...(body.all ? { createdAt: { $lte: new Date(body.before) } } : { _id: { $in: ids } }) };
  let update: any;
  if (operation === "read") { filter.read_at = null; update = { $set: { read_at: now, expires_at: new Date(now.getTime() + NOTIFICATION_RETENTION_MS), next_reminder_at: null } }; }
  if (operation === "unread") update = { $set: { read_at: null, expires_at: null, next_reminder_at: new Date(now.getTime() + 86400_000), reminder_count: 0 } };
  if (operation === "archive") update = { $set: { archived_at: now, expires_at: new Date(now.getTime() + NOTIFICATION_RETENTION_MS), next_reminder_at: null } };
  if (operation === "snooze") {
    const hours = Number(body.hours); if (![1, 8, 24, 168].includes(hours)) throw Object.assign(new Error("Choose a valid snooze duration"), { status: 400 });
    update = { $set: { snoozed_until: new Date(now.getTime() + hours * 3600_000), next_reminder_at: new Date(now.getTime() + hours * 3600_000) } };
  }
  const result = await Notifications.updateMany(filter, update);
  return { unreadCount: await Notifications.countDocuments(unreadFilter(userId)), modifiedCount: result.modifiedCount };
}

export async function persistInbox(records: any[], key: string, createdAt: Date, session: mongoose.ClientSession) {
  await Notifications.bulkWrite(records.map((record, index) => {
    const data = record.data || {};
    const actionRequired = data.actionRequired === "true" || data.event === "forward" || data.event === "assigned" || data.event === "approval-requested";
    return { updateOne: { filter: { _id: inboxId(key, index) }, update: { $setOnInsert: { ...record, action_required: actionRequired,
      archived_at: null, expires_at: null, snoozed_until: null, reminder_count: 0,
      next_reminder_at: actionRequired ? new Date(createdAt.getTime() + 86400_000) : null, createdAt, updatedAt: createdAt } }, upsert: true, timestamps: false } };
  }), { session });
}
