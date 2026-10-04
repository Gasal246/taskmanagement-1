import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Notifications from "@/models/notifications.model";
import Preferences from "@/models/notification_preferences.model";
import { NextResponse } from "next/server";
export async function GET() {
  await connectDB(); const session = await auth(); const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const prefs: any = await Preferences.findOne({ user_id: userId }).lean();
  return NextResponse.json({ reminders_enabled: prefs?.reminders_enabled ?? true, reminder_hours: prefs?.reminder_hours || 24, email_fallback: prefs?.email_fallback ?? false,
    email_available: Boolean(process.env.NEXT_NODEMAILER_USER && process.env.NEXT_NODEMAILER_PASS && process.env.APP_URL) });
}
export async function PUT(req: Request) {
  await connectDB(); const session = await auth(); const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (typeof body.reminders_enabled !== "boolean" || typeof body.email_fallback !== "boolean" || ![24, 48, 72].includes(body.reminder_hours)) return NextResponse.json({ message: "Invalid preferences" }, { status: 400 });
  if (body.email_fallback && !(process.env.NEXT_NODEMAILER_USER && process.env.NEXT_NODEMAILER_PASS && process.env.APP_URL)) return NextResponse.json({ message: "Email reminders are not configured on this server" }, { status: 400 });
  await Preferences.updateOne({ user_id: userId }, { $set: { reminders_enabled: body.reminders_enabled, reminder_hours: body.reminder_hours, email_fallback: body.email_fallback } }, { upsert: true });
  if (body.reminders_enabled) await Notifications.updateMany({ recipient_id: userId, action_required: true, read_at: null, archived_at: null, reminder_count: { $lt: 3 }, next_reminder_at: null }, { $set: { next_reminder_at: new Date(Date.now() + body.reminder_hours * 3600_000) } });
  return NextResponse.json({ message: "Notification preferences saved" });
}
