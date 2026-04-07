import FcmTokens from "@/models/fcm_tokens.model";
import Notifications from "@/models/notifications.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";

const truncateText = (value: string, maxLength: number) => {
  const text = value?.trim() || "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const formatDateLabel = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export async function notifyCalendarEventRecipients({
  recipientIds,
  senderId,
  senderName,
  eventId,
  eventTitle,
  description,
  startDate,
  endDate,
}: {
  recipientIds: string[];
  senderId: string;
  senderName: string;
  eventId: string;
  eventTitle: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
}) {
  const recipients = Array.from(
    new Set(
      recipientIds
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .filter((id) => id !== String(senderId))
    )
  );
  if (recipients.length === 0) return;

  const titleText = truncateText(eventTitle || "Calendar Event", 80);
  const descriptionText = truncateText(description || "", 120);
  const startLabel = formatDateLabel(startDate);
  const endLabel = formatDateLabel(endDate);
  const bodyText = [descriptionText, startLabel ? `Starts ${startLabel}` : "", endLabel ? `Ends ${endLabel}` : ""]
    .filter(Boolean)
    .join(" • ");

  const payload = recipients.map((recipientId) => ({
    recipient_id: recipientId,
    sender_id: senderId,
    kind: "calendar",
    title: `New Schedule: ${titleText}`,
    body: bodyText || titleText,
    data: {
      type: "calendar",
      eventId,
      link: "/staff/calendar",
      eventTitle: titleText,
      eventStart: startDate ? new Date(startDate).toISOString() : "",
      eventEnd: endDate ? new Date(endDate).toISOString() : "",
      senderName,
    },
    meta: {
      eventId,
      eventTitle: titleText,
      eventDescription: descriptionText,
      eventStart: startDate ? new Date(startDate).toISOString() : "",
      eventEnd: endDate ? new Date(endDate).toISOString() : "",
      senderName,
    },
    read_at: null,
  }));

  await Notifications.insertMany(payload);

  try {
    const tokens = await FcmTokens.find(
      { user_id: { $in: recipients } },
      { token: 1 }
    ).lean();
    const tokenList = tokens.map((item: any) => item.token).filter(Boolean);
    if (tokenList.length === 0) return;

    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens: tokenList,
      notification: {
        title: `New Schedule: ${titleText}`,
        body: bodyText || titleText,
      },
      data: {
        type: "calendar",
        eventId,
        link: "/staff/calendar",
        eventTitle: titleText,
        eventStart: startDate ? new Date(startDate).toISOString() : "",
        eventEnd: endDate ? new Date(endDate).toISOString() : "",
        senderName: senderName || "",
      },
    });

    const invalidTokens = response.responses
      .map((res, index) => {
        const code = res.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          return tokenList[index];
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (invalidTokens.length > 0) {
      await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
    }
  } catch (error) {
    console.log("Failed to send calendar notifications", error);
  }
}
