import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
import { NextResponse } from "next/server";
export async function POST() {
  await connectDB(); const session = await auth(); const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const title = "Notification test", body = "Notifications are working for this account. Open this item to mark it read.";
  await enqueueNotifications([{ recipient_id: userId, sender_id: userId, kind: "test", title, body, data: {}, meta: {}, read_at: null }], { notification: { title, body }, data: {} }, `test:${userId}:${Math.floor(Date.now() / 60000)}`);
  return NextResponse.json({ message: "Test queued" }, { status: 202 });
}
