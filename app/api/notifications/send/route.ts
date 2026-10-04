import mongoose from "mongoose";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
import { canManageUsers } from "@/lib/server-access";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import FcmTokens from "@/models/fcm_tokens.model";

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

export async function POST(req: Request) {
  try {
    await connectDB();
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
    if (!hasValidApiKey && !session?.user?.is_super) {
      const ids = Array.isArray(body.recipientIds) ? [...new Set(body.recipientIds)] : [];
      if (body.token || body.tokens?.length || body.topic || ids.length > 100 || !await canManageUsers(sessionUserId, ids)) {
        return NextResponse.json({ message: "Send only to staff you manage", status: 403 }, { status: 403 });
      }
    }
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

    const title =
      notification?.title ||
      data?.title ||
      data?.heading ||
      "Notification";
    const bodyText = notification?.body || data?.body || "";
    const senderId =
      sessionUserId ||
      (hasValidApiKey ? body.senderId?.trim() : "") ||
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

    if (topic) return NextResponse.json({ message: "Use explicit recipient IDs so every notification has a recoverable inbox entry" }, { status: 400 });
    const suppliedTokens = [...new Set([token, ...tokens].filter(Boolean))];
    const devices = suppliedTokens.length ? await FcmTokens.find({ token: { $in: suppliedTokens } }).select("user_id").lean() : [];
    const recipients = [...new Set([...recipientIds, ...devices.map((device: any) => String(device.user_id))])];
    if (!recipients.length || recipients.some(id => !mongoose.isValidObjectId(id))) return NextResponse.json({ message: "Provide valid recipients or registered devices" }, { status: 400 });
    const payloadData = { ...(data || {}), ...(typeof body.data?.link === "string" ? { link: body.data.link } : {}) };
    await enqueueNotifications(recipients.map(recipient_id => ({ recipient_id, sender_id: senderId || null, kind, title, body: bodyText, data: payloadData, meta, read_at: null })), { notification: { title, body: bodyText }, data: payloadData });
    return NextResponse.json({ message: "Notification saved and delivery queued", status: 202, recipientCount: recipients.length }, { status: 202 });
  } catch (error: any) {
    console.error("FCM send error", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
