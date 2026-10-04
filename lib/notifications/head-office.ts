import type { ClientSession } from "mongoose";
import Admins from "@/models/admin_assign_business.model";
import Users from "@/models/users.model";
import Roles from "@/models/user_roles.model";
import "@/models/roles.model";
import Notifications from "@/models/notifications.model";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
export async function notifyHeadOffice(request: any, actorId: string, event: "requested" | "approved" | "rejected" | "withdrawn", session?: ClientSession) {
  let recipients: string[] = [];
  if (event === "requested") {
    const admins = await Admins.find({ business_id: request.business_id, status: 1 }).distinct("user_id").session(session || null);
    const roles: any[] = await Roles.find({ user_id: { $in: admins }, status: 1, $or: [{ business_id: request.business_id }, { business_id: null }] }).populate("role_id", "role_name").session(session || null).lean();
    const granted = roles.filter(row => row.role_id?.role_name === "BUSINESS_ADMIN").map(row => row.user_id);
    recipients = (await Users.find({ _id: { $in: granted }, status: 1 }).distinct("_id").session(session || null)).map(String);
  } else if (event !== "withdrawn") recipients = [String(request.requested_by)];
  await Notifications.updateMany({ "data.requestId": String(request._id), action_required: true }, { $set: { action_required: false, next_reminder_at: null } }, { session });
  recipients = recipients.filter(id => id !== actorId);
  if (!recipients.length) return;
  const title = event === "requested" ? "Head office approval requested" : `Head office request ${event}`;
  const body = event === "requested" ? `Review the proposed ${request.operation} request and its affected facilities.` : request.review_note || `Your head office request has been ${event}.`;
  const data = { type: "head-office-request", requestId: String(request._id), event: event === "requested" ? "approval-requested" : event,
    businessId: String(request.business_id), actionRequired: event === "requested" ? "true" : "false",
    ...(request.enquiry_id ? { enquiryId: String(request.enquiry_id) } : {}) };
  await enqueueNotifications(recipients.map(recipient_id => ({ recipient_id, sender_id: actorId, kind: "head-office-request", title, body, data, meta: data, read_at: null })), { notification: { title, body }, data }, `office:${request._id}:${request.revision}:${event}`, session);
}
