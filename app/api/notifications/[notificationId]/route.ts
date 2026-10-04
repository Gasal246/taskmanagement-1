import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import "@/models/users.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/utils";
import { serializeNotification } from "@/lib/notifications/inbox";
import { notificationTarget } from "@/lib/notifications/target";
export async function GET(_req: Request, context: { params: Promise<{ notificationId: string }> }) {
  await connectDB(); const userId = resolveSessionUserId(await auth());
  if (!userId) return NextResponse.json({ message: "Sign in to open this notification" }, { status: 401 });
  const { notificationId } = await context.params;
  if (!mongoose.isValidObjectId(notificationId)) return NextResponse.json({ message: "Invalid notification" }, { status: 400 });
  const item: any = await Notifications.findOne({ _id: notificationId, recipient_id: userId }).populate("sender_id", "name email avatar_url").lean();
  if (!item) return NextResponse.json({ message: "This notification is no longer available for this account" }, { status: 404 });
  return NextResponse.json({ notification: serializeNotification(item), target: await notificationTarget(item) }, { headers: { "Cache-Control": "private, no-store" } });
}
