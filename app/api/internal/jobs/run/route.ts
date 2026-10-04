import { NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { authorizedJobRunner } from "@/lib/jobs/secret";
import { runJobBatch } from "@/lib/jobs/worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
    return NextResponse.json({ message: "Job runner is not configured" }, { status: 503 });
  }
  if (!authorizedJobRunner(request)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    await connectDB({ throwOnError: true });
    return NextResponse.json(await runJobBatch(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Job runner unavailable" }, { status: 503 });
  }
}
export const GET = POST;
