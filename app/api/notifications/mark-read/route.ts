import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";
import { changeNotificationState } from "@/lib/notifications/inbox";
export async function POST(req: Request) {
  try {
    await connectDB(); const userId = resolveSessionUserId(await auth());
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await changeNotificationState(userId, await req.json()), { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) { return NextResponse.json({ message: error.status ? error.message : "Unable to update notifications" }, { status: error.status || 500 }); }
}
export const dynamic = "force-dynamic";
