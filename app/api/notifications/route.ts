import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import { NOTIFICATION_RETENTION_MS } from "@/lib/constants";

connectDB();

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || 30);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 30;

    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_MS);

    await Notifications.deleteMany({
      recipient_id: userId,
      createdAt: { $lt: cutoff },
    });

    const [notifications, unreadCount] = await Promise.all([
      Notifications.find({ recipient_id: userId, createdAt: { $gte: cutoff } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("sender_id", "name email avatar_url")
        .lean(),
      Notifications.countDocuments({
        recipient_id: userId,
        read_at: null,
        createdAt: { $gte: cutoff },
      }),
    ]);

    const payload = notifications.map((notification: any) => ({
      id: String(notification._id),
      kind: notification.kind || "general",
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      meta: notification.meta || {},
      createdAt: notification.createdAt,
      readAt: notification.read_at ?? null,
      sender: notification.sender_id
        ? {
            id: String(notification.sender_id._id),
            name: notification.sender_id.name ?? "",
            email: notification.sender_id.email ?? "",
            avatar_url: notification.sender_id.avatar_url ?? "",
          }
        : null,
    }));

    return NextResponse.json(
      { status: 200, notifications: payload, unreadCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
