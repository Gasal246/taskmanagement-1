import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Jobs from "@/models/background_jobs.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.user.is_super) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  try {
    await connectDB({ throwOnError: true });
    const params = new URL(request.url).searchParams;
    const status = params.get("status") || "failed";
    if (!["pending", "processing", "completed", "failed"].includes(status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    const page = Math.min(1000, Math.max(1, Number(params.get("page")) || 1));
    if (!Number.isInteger(page)) return NextResponse.json({ message: "Invalid page" }, { status: 400 });
    const [jobs, total, counts, oldest] = await Promise.all([
      Jobs.find({ status }).select("kind status attempts last_error createdAt updatedAt available_at retry_count retried_at completed_at").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
      Jobs.countDocuments({ status }),
      Jobs.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).hint({ status: 1, createdAt: -1, _id: -1 }),
      Jobs.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    ]);
    return NextResponse.json({ jobs, total, page, counts, oldestPendingAt: (oldest as any)?.createdAt || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ message: "Could not load background jobs" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.user.is_super) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  if (!mongoose.isValidObjectId(body?.jobId)) return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
  try {
    await connectDB({ throwOnError: true });
    const job = await Jobs.findOneAndUpdate({ _id: body.jobId, status: "failed" }, {
      $set: { status: "pending", attempts: 0, available_at: new Date(), last_error: null,
        lease_until: null, lease_token: null, retried_at: new Date(), last_retry_by: session.user.id },
      $inc: { retry_count: 1 },
    });
    if (!job) return NextResponse.json({ message: "Only failed jobs can be retried. Refresh the list." }, { status: 409 });
    return NextResponse.json({ message: "Retry queued" });
  } catch { return NextResponse.json({ message: "Could not retry the job" }, { status: 503 }); }
}
