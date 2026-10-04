import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import "@/models/users.model";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { serializeNotification, unreadFilter } from "@/lib/notifications/inbox";
export async function GET(req: Request) {
  try {
    await connectDB(); const userId = resolveSessionUserId(await auth());
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const limit = Math.min(50, Math.max(1, Number(params.get("limit")) || 30));
    const filter: any = { recipient_id: userId, archived_at: null };
    if (params.get("filter") === "unread") filter.read_at = null;
    const category = params.get("category");
    const groups: Record<string, string[]> = { task: ["task", "task-activity", "task-activity-comment"], enquiry: ["enquiry", "head-office-request"], project: ["project", "project-head", "account-manager", "site-operational-head", "project-supervisor", "project-team"], calendar: ["calendar"] };
    if (category && groups[category]) filter.kind = { $in: groups[category] };
    const cursor = params.get("cursor");
    if (cursor) {
      const [date, id] = cursor.split("|");
      if (!Number.isFinite(Date.parse(date)) || !mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
      filter.$or = [{ createdAt: { $lt: new Date(date) } }, { createdAt: new Date(date), _id: { $lt: id } }];
    }
    const snapshotAt = new Date().toISOString();
    const [rows, unreadCount] = await Promise.all([
      Notifications.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).populate("sender_id", "name email avatar_url").lean(),
      Notifications.countDocuments(unreadFilter(userId)),
    ]);
    const items = rows.slice(0, limit); const last: any = items[items.length - 1];
    return NextResponse.json({ notifications: items.map(serializeNotification), unreadCount, snapshotAt,
      nextCursor: rows.length > limit && last ? `${new Date(last.createdAt).toISOString()}|${last._id}` : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ message: "Unable to load notifications" }, { status: 500 }); }
}
export const dynamic = "force-dynamic";
