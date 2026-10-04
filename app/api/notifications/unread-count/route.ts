import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import { unreadFilter } from "@/lib/notifications/inbox";

export async function GET() {
  try {
        await connectDB();
    const session = await auth();
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    const unreadCount = await Notifications.countDocuments(unreadFilter(userId));

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
