import Notifications from "@/models/notifications.model";
import FcmTokens from "@/models/fcm_tokens.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";

type ProjectHeadNotificationEvent = "assigned" | "removed";

export async function notifyProjectHeadChange({
  recipientIds,
  actorId,
  projectId,
  projectName,
  event,
}: {
  recipientIds: string[];
  actorId?: string | null;
  projectId: string;
  projectName: string;
  event: ProjectHeadNotificationEvent;
}) {
  const recipients = Array.from(new Set(recipientIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const title =
    event === "assigned" ? "Project Head Assigned" : "Project Head Removed";
  const body =
    event === "assigned"
      ? `You are assigned as the Head of ${projectName}`
      : `You are no longer the Head of project ${projectName}`;

  const data = {
    type: "project-head",
    event,
    projectId,
    projectName,
  };

  const meta = {
    ...data,
    link: `/staff/projects/${projectId}`,
  };

  await Notifications.insertMany(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actorId || null,
      kind: "project-head",
      title,
      body,
      data,
      meta,
      read_at: null,
    }))
  );

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
        title,
        body,
      },
      data,
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
    console.log("Failed to send project head notification", error);
  }
}
