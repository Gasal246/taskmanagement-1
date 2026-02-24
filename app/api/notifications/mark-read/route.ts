import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import { NOTIFICATION_RETENTION_MS } from "@/lib/constants";

connectDB();

type Body = {
  ids?: string[];
  all?: boolean;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const body: Body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const markAll = Boolean(body?.all);

    if (!markAll && ids.length === 0) {
      return NextResponse.json(
        { message: "Provide ids or set all=true", status: 400 },
        { status: 400 }
      );
    }

    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_MS);
    const filter: Record<string, any> = {
      recipient_id: userId,
      read_at: null,
      createdAt: { $gte: cutoff },
    };

    if (!markAll) {
      filter._id = { $in: ids };
    }

    await Notifications.updateMany(filter, { $set: { read_at: new Date() } });

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
    console.error("Failed to mark notifications read", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
