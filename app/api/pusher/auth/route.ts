import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { getPusherInstance } from "@/lib/pusher/server";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const data = new URLSearchParams(await req.text());
    const socketId = data.get("socket_id") || "";
    const channelName = data.get("channel_name") || "";
    if (!/^\d+\.\d+$/.test(socketId)) return NextResponse.json({ message: "Invalid socket" }, { status: 400 });
    let allowed = channelName === `private-user-${session.user.id}`;
    if (channelName.startsWith("private-project-")) {
      const projectId = channelName.slice("private-project-".length);
      if (mongoose.isValidObjectId(projectId)) {
        const access = await resolveProjectAccess(projectId, session.user.id);
        allowed = Boolean(access?.canView);
      }
    }
    if (!allowed) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json(getPusherInstance().authorizeChannel(socketId, channelName), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Realtime authorization failed", error);
    return NextResponse.json({ message: "Unable to authorize realtime updates" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
