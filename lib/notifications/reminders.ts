import Notifications from "@/models/notifications.model";
import Preferences from "@/models/notification_preferences.model";
import Tokens from "@/models/fcm_tokens.model";
import Users from "@/models/users.model";
import Tasks from "@/models/business_tasks.model";
import Requests from "@/models/eq_head_office_request.model";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { inTransaction } from "@/lib/jobs/transaction";
import mongoose from "mongoose";
export async function scheduleNotificationReminders(now = new Date()) {
  const candidates: any[] = await Notifications.find({ action_required: true, read_at: null, archived_at: null, reminder_count: { $lt: 3 }, next_reminder_at: { $ne: null, $lte: now } }).sort({ next_reminder_at: 1 }).limit(100).lean();
  for (const candidate of candidates) await inTransaction(async session => {
    const item: any = await Notifications.findOne({ _id: candidate._id, read_at: null, archived_at: null, action_required: true, reminder_count: candidate.reminder_count }).session(session);
    if (!item) return true;
    const prefs: any = await Preferences.findOne({ user_id: item.recipient_id }).session(session).lean();
    const user: any = await Users.findOne({ _id: item.recipient_id, status: 1 }).select("email").session(session).lean();
    if (!user || prefs?.reminders_enabled === false) { item.next_reminder_at = null; await item.save({ session }); return true; }
    const task: any = mongoose.isValidObjectId(item.data?.taskId) ? await Tasks.findById(item.data.taskId).select("status").session(session).lean() : null;
    const request: any = mongoose.isValidObjectId(item.data?.requestId) ? await Requests.findById(item.data.requestId).select("status").session(session).lean() : null;
    if ((task && ["Completed", "Closed", "Cancelled"].includes(task.status)) || (request && request.status !== "pending")) { item.action_required = false; item.next_reminder_at = null; await item.save({ session }); return true; }
    const hours = prefs?.reminder_hours || 24;
    const earliest = Math.max(new Date(item.createdAt).getTime() + hours * 3600_000, item.snoozed_until?.getTime() || 0);
    if (earliest > now.getTime()) { item.next_reminder_at = new Date(earliest); await item.save({ session }); return true; }
    const key = `reminder:${item._id}:${item.reminder_count}`;
    const push = { notification: { title: `Reminder: ${item.title}`, body: "You have an unread notification that needs attention." }, data: { notificationId: String(item._id), recipientId: String(item.recipient_id), link: `/notifications/${item._id}`, reminder: "true" } };
    const devices: any[] = await Tokens.find({ user_id: item.recipient_id }).select("token user_id").session(session).lean();
    if (!devices.length && !(prefs?.email_fallback && user.email)) { item.next_reminder_at = new Date(now.getTime() + hours * 3600_000); await item.save({ session }); return true; }
    for (let offset = 0; offset < devices.length; offset += 100) await enqueueJob("push", `${key}:${offset / 100}`, { devices: devices.slice(offset, offset + 100).map(device => ({ id: String(device._id), userId: String(device.user_id), token: device.token })), push }, session);
    if (prefs?.email_fallback && user.email) await enqueueJob("notification-email", `${key}:email`, { notificationId: String(item._id), recipientId: String(item.recipient_id) }, session);
    item.reminder_count += 1; item.next_reminder_at = item.reminder_count < 3 ? new Date(now.getTime() + hours * 3600_000) : null;
    await item.save({ session }); return true;
  });
  return candidates.length;
}
