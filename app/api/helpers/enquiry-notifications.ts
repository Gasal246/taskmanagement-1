import Eq_enquiry from "@/models/eq_enquiries.model";
import Notifications from "@/models/notifications.model";
import FcmTokens from "@/models/fcm_tokens.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
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
}: {
  req: NextRequest;
  recipientIds: string[];
  enquiryId: string;
  action: string;
  priority: number;
  actorId: string;
  actorName: string;
}) {
  const recipients = Array.from(new Set(recipientIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const enquiry: { enquiry_uuid?: string } | null = await Eq_enquiry.findById(enquiryId)
    .select("enquiry_uuid")
    .lean<{ enquiry_uuid?: string }>();
  const enquiryUuid = enquiry?.enquiry_uuid || "";

  const { role, domain, byLine } = resolveRoleDomain(req);
  const priorityLabel = typeof priority === "number" ? `${priority}` : `${priority || ""}`;
  const actionLabel = action || "Action";
  const forwardTitle = `Enquiry Forwarded to ${actionLabel}`;
  const viewTitle = "Enquiry View Access";
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

  const notificationsPayload = recipients.flatMap((recipientId) => [
    {
      recipient_id: recipientId,
      sender_id: actorId,
      kind: "enquiry",
      title: viewTitle,
      body: bodyText,
      data: { ...dataBase, event: "view-access" },
      meta: { ...metaBase, event: "view-access" },
      read_at: null,
    },
    {
      recipient_id: recipientId,
      sender_id: actorId,
      kind: "enquiry",
      title: forwardTitle,
      body: bodyText,
      data: { ...dataBase, event: "forward" },
      meta: { ...metaBase, event: "forward" },
      read_at: null,
    },
  ]);

  await Notifications.insertMany(notificationsPayload);

  const tokenDocs = await FcmTokens.find(
    { user_id: { $in: recipients } },
    { token: 1 }
  ).lean();
  const tokens = tokenDocs.map((doc: any) => doc.token).filter(Boolean);
  if (tokens.length === 0) return;

  try {
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: forwardTitle,
        body: bodyText,
      },
      data: dataBase,
    });
    const invalidTokens = response.responses
      .map((res, index) => {
        const code = res.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          return tokens[index];
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (invalidTokens.length > 0) {
      await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
    }
  } catch (error) {
    console.log("Failed to send enquiry notifications", error);
  }
}
