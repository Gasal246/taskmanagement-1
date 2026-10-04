import Eq_enquiry from "@/models/eq_enquiries.model";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
import type { ClientSession } from "mongoose";
import type { NextRequest } from "next/server";

const resolveRoleDomain = (req: NextRequest) => {
  const roleCookie = req.cookies.get("user_role")?.value || "";
  const domainCookie = req.cookies.get("user_domain")?.value || "";
  let roleLabel = "";
  let domainLabel = "";
  try {
    const parsedRole = roleCookie ? JSON.parse(roleCookie) : null;
    roleLabel = parsedRole?.role_name || parsedRole?.role || "";
  } catch (error) {
    roleLabel = "";
  }
  try {
    const parsedDomain = domainCookie ? JSON.parse(domainCookie) : null;
    domainLabel =
      parsedDomain?.region_name ||
      parsedDomain?.area_name ||
      parsedDomain?.location_name ||
      parsedDomain?.dept_name ||
      parsedDomain?.name ||
      "";
  } catch (error) {
    domainLabel = "";
  }
  const formattedRole = roleLabel ? roleLabel.split("_").join(" ") : "";
  const byLineParts = [formattedRole || roleLabel, domainLabel].filter(Boolean);
  return {
    role: formattedRole || roleLabel,
    domain: domainLabel,
    byLine: byLineParts.join(" + "),
  };
};

export async function notifyEnquiryForward({
  req,
  recipientIds,
  enquiryId,
  action,
  priority,
  actorId,
  actorName,
  dbSession,
  eventKey,
}: {
  req: NextRequest;
  recipientIds: string[];
  enquiryId: string;
  action: string;
  priority: number;
  actorId: string;
  actorName: string;
  dbSession?: ClientSession;
  eventKey?: string;
}) {
  const recipients = Array.from(new Set(recipientIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const enquiry: { enquiry_uuid?: string } | null = await Eq_enquiry.findById(enquiryId)
    .select("enquiry_uuid")
    .session(dbSession ?? null).lean<{ enquiry_uuid?: string }>();
  const enquiryUuid = enquiry?.enquiry_uuid || "";

  const { role, domain, byLine } = resolveRoleDomain(req);
  const priorityLabel = typeof priority === "number" ? `${priority}` : `${priority || ""}`;
  const actionLabel = action || "Action";
  const forwardTitle = `Enquiry Forwarded to ${actionLabel}`;
  const bodyText = priorityLabel ? `Priority: ${priorityLabel}` : "Priority updated";

  const metaBase = {
    enquiryId,
    enquiryUuid,
    priority: priorityLabel,
    action: actionLabel,
    actorName,
    actorRole: role,
    actorDomain: domain,
    byLine,
  };

  const dataBase: Record<string, string> = {
    type: "enquiry",
    enquiryId,
    enquiryUuid,
    priority: priorityLabel,
    action: actionLabel,
    actorName,
    byLine,
  };

  const notificationsPayload = recipients.map((recipientId) => ({
    recipient_id: recipientId, sender_id: actorId, kind: "enquiry", title: forwardTitle,
    body: bodyText, data: { ...dataBase, event: "forward", actionRequired: "true" }, meta: { ...metaBase, event: "forward" }, read_at: null,
  }));

  await enqueueNotifications(notificationsPayload, {
    notification: { title: forwardTitle, body: bodyText }, data: dataBase,
  }, eventKey, dbSession);
}
