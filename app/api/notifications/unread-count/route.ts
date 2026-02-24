import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import { NOTIFICATION_RETENTION_MS } from "@/lib/constants";

connectDB();

export async function GET() {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_MS);

    await Notifications.deleteMany({
      recipient_id: userId,
      createdAt: { $lt: cutoff },
    });

    const unreadCount = await Notifications.countDocuments({
      recipient_id: userId,
      read_at: null,
      createdAt: { $gte: cutoff },
    });

    return NextResponse.json(
      { status: 200, unreadCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch unread notification count", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
