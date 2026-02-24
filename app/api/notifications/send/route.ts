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

function normalizeData(
  data?: Record<string, string | number | boolean>
): Record<string, string> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );
}

function isTokenInvalid(error: any): boolean {
  const code = error?.code || error?.errorInfo?.code || "";
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FCM_API_KEY;
    if (apiKey) {
      const headerKey = req.headers.get("x-api-key");
      if (headerKey !== apiKey) {
        return NextResponse.json(
          { message: "Unauthorized", status: 401 },
          { status: 401 }
        );
      }
    }

    const body: Body = await req.json();
    const token = body.token?.trim();
    const tokens = body.tokens?.filter(Boolean) ?? [];
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
    const senderId =
      body.senderId?.trim() ||
      (typeof body.data?.senderId === "string" ? body.data.senderId : "") ||
      (typeof body.data?.sender_id === "string" ? body.data.sender_id : "");
    const recipientIds = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter(Boolean)
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

    if (tokens.length > 0) {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification,
        data,
      });
      const invalidTokens = response.responses
        .map((res, idx) => (isTokenInvalid(res.error) ? tokens[idx] : null))
        .filter(Boolean) as string[];
      if (invalidTokens.length > 0) {
        await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
      }
      const successTokens = tokens.filter(
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
          responses: response.responses.map((res, idx) => ({
            token: tokens[idx],
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
        messageId = await messaging.send({
          token,
          notification,
          data,
        });
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
      const messageId = await messaging.send({
        topic,
        notification,
        data,
      });
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
