import { NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { authorizedJobRunner } from "@/lib/jobs/secret";
import { notificationWorkerHealth } from "@/lib/jobs/health";
export async function GET(req: Request) {
  if (!authorizedJobRunner(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try { await connectDB(); const health = await notificationWorkerHealth(); return NextResponse.json(health, { status: health.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ healthy: false }, { status: 503 }); }
}
