import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import ActivityComments from "@/models/activity_comments.model";
import { authorizeActivityViewer } from "@/app/api/helpers/activity-comments";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

connectDB();

export async function POST(
  req: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { activityId } = await context.params;
  if (!mongoose.isValidObjectId(activityId)) return NextResponse.json({ message: "Invalid activity" }, { status: 400 });
  const access = await authorizeActivityViewer(userId, activityId);
  if (access.status !== 200) return NextResponse.json({ message: "Forbidden" }, { status: access.status });

  const payload = await req.json();
  const requested = Array.from(new Set(Array.isArray(payload?.commentIds) ? payload.commentIds : []))
    .filter((id): id is string => typeof id === "string" && mongoose.isValidObjectId(id))
    .slice(0, 200);
  if (!requested.length) return NextResponse.json({ seen: [] });

  const valid = await ActivityComments.find({
    _id: { $in: requested },
    activity_id: activityId,
    deleted_at: null,
    author_id: { $ne: userId },
  }).select("_id").lean();
  const now = new Date();
  if (valid.length) {
    await ActivityCommentReads.bulkWrite(
      valid.map((comment: any) => ({
        updateOne: {
          filter: { comment_id: comment._id, user_id: userId },
          update: { $set: { seen_at: now } },
          upsert: true,
        },
      }))
    );
  }
  return NextResponse.json({ seen: valid.map((comment: any) => String(comment._id)) });
}

export const dynamic = "force-dynamic";
