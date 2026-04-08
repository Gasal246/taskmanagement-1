import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
import connectDB from "@/lib/mongo";
import FcmTokens from "@/models/fcm_tokens.model";
import Notifications from "@/models/notifications.model";

connectDB();

type Body = {
  token?: string;
  tokens?: string[];
  topic?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | number | boolean>;
  recipientIds?: string[];
  senderId?: string;
  kind?: string;
  meta?: Record<string, any>;
};

function resolveLink(
  body: Body,
  data: Record<string, string> | undefined,
  req: Request
): string {
  const rawValue =
    (typeof data?.link === "string" && data.link) ||
    (typeof data?.url === "string" && data.url) ||
    (typeof body.meta?.link === "string" && body.meta.link) ||
    (typeof body.meta?.url === "string" && body.meta.url) ||
    "/";

  const trimmed = rawValue.trim();
  if (!trimmed) return new URL("/", req.url).toString();

  try {
    return new URL(trimmed).toString();
  } catch (_error) {
    return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, req.url).toString();
  }
}

function normalizeData(
  data?: Record<string, string | number | boolean>
): Record<string, string> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );
}

function isTokenInvalid(error: any): boolean {
  const code = error?.code || "";
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FCM_API_KEY;
    const headerKey = req.headers.get("x-api-key");
    const session: any = await auth();
    const sessionUserId = session?.user?.id ? String(session.user.id) : "";
    const hasValidApiKey = apiKey ? headerKey === apiKey : false;

    if (!hasValidApiKey && !sessionUserId) {
      return NextResponse.json(
        { message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const body: Body = await req.json();
    const token = body.token?.trim();
    const tokens = body.tokens?.map((item) => item?.trim()).filter(Boolean) ?? [];
    const topic = body.topic?.trim();
    const notification =
      body.title || body.body
        ? {
            title: body.title || "",
            body: body.body || "",
          }
        : undefined;

    const data = normalizeData(body.data);
    if (!notification && !data) {
      return NextResponse.json(
        { message: "Notification title/body or data is required", status: 400 },
        { status: 400 }
      );
    }

    const messaging = getAdminMessaging();
    const title =
      notification?.title ||
      data?.title ||
      data?.heading ||
      "Notification";
    const bodyText = notification?.body || data?.body || "";
    const webpushLink = resolveLink(body, data, req);
    const senderId =
      body.senderId?.trim() ||
      sessionUserId ||
      (typeof body.data?.senderId === "string" ? body.data.senderId : "") ||
      (typeof body.data?.sender_id === "string" ? body.data.sender_id : "");
    const recipientIds = Array.isArray(body.recipientIds)
      ? body.recipientIds.map((id) => id?.trim()).filter(Boolean)
      : [];
    const kind =
      body.kind ||
      (typeof (body.data as any)?.type === "string"
        ? String((body.data as any).type)
        : "general");
    const meta = body.meta ?? {};

    const resolveRecipients = async (tokenList: string[]) => {
      if (tokenList.length === 0) return [];
      const tokenDocs = await FcmTokens.find(
        { token: { $in: tokenList } },
        { user_id: 1 }
      ).lean();
      return tokenDocs.map((doc: any) => String(doc.user_id));
    };

    const saveNotifications = async (resolvedIds: string[]) => {
      const uniqueIds = Array.from(
        new Set([
          ...resolvedIds,
          ...recipientIds.map((id) => id.trim()).filter(Boolean),
        ])
      );
      if (uniqueIds.length === 0) return;
      const documents = uniqueIds.map((recipientId) => ({
        recipient_id: recipientId,
        sender_id: senderId || null,
        kind,
        title,
        body: bodyText,
        data: body.data ?? {},
        meta,
        read_at: null,
      }));
      await Notifications.insertMany(documents);
    };

    let targetTokens = Array.from(new Set(tokens));
    let missingRecipientIds: string[] = [];

    const baseMessagePayload = {
      notification,
      data,
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: notification
          ? {
              title: notification.title || title,
              body: notification.body || bodyText,
              icon: "/logo.png",
              badge: "/logo.png",
            }
          : undefined,
        data,
        fcmOptions: {
          link: webpushLink,
        },
      },
    };

    if (targetTokens.length === 0 && recipientIds.length > 0) {
      const recipientTokenDocs = await FcmTokens.find(
        { user_id: { $in: recipientIds } },
        { token: 1, user_id: 1 }
      ).lean();

      targetTokens = Array.from(
        new Set(
          recipientTokenDocs
            .map((doc: any) => doc?.token?.trim())
            .filter(Boolean)
        )
      );

      const resolvedRecipientIds = new Set(
        recipientTokenDocs.map((doc: any) => String(doc.user_id))
      );
      missingRecipientIds = recipientIds.filter(
        (recipientId) => !resolvedRecipientIds.has(recipientId)
      );

      if (targetTokens.length === 0) {
        return NextResponse.json(
          {
            message: "No active push token found for the selected recipient(s)",
            status: 404,
            missingRecipientIds,
          },
          { status: 404 }
        );
      }
    }

    if (targetTokens.length > 0) {
      const response = await messaging.sendEachForMulticast(
        {
          tokens: targetTokens,
          ...baseMessagePayload,
        }
      );
      const invalidTokens = response.responses
        .map((res, idx) =>
          isTokenInvalid(res.error) ? targetTokens[idx] : null
        )
        .filter(Boolean) as string[];
      if (invalidTokens.length > 0) {
        await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
      }
      const successTokens = targetTokens.filter(
        (_token, index) => response.responses[index]?.success
      );
      const resolvedIds = await resolveRecipients(successTokens);
      await saveNotifications(resolvedIds);
      return NextResponse.json(
        {
          message: "Multicast sent",
          status: 200,
          successCount: response.successCount,
          failureCount: response.failureCount,
          missingRecipientIds,
          responses: response.responses.map((res, idx) => ({
            token: targetTokens[idx],
            success: res.success,
            messageId: res.messageId || null,
            error: res.error?.message || null,
          })),
        },
        { status: 200 }
      );
    }

    if (token) {
      let messageId = "";
      try {
        messageId = await messaging.send(
          {
            token,
            ...baseMessagePayload,
          }
        );
      } catch (error: any) {
        if (isTokenInvalid(error)) {
          await FcmTokens.deleteOne({ token });
          return NextResponse.json(
            { message: "Token not registered", status: 410 },
            { status: 410 }
          );
        }
        throw error;
      }
      const resolvedIds = await resolveRecipients([token]);
      await saveNotifications(resolvedIds);
      return NextResponse.json(
        { message: "Sent", status: 200, messageId },
        { status: 200 }
      );
    }

    if (topic) {
      const messageId = await messaging.send(
        {
          topic,
          ...baseMessagePayload,
        }
      );
      await saveNotifications([]);
      return NextResponse.json(
        { message: "Sent", status: 200, messageId },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Provide token, tokens, or topic",
        status: 400,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("FCM send error", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
