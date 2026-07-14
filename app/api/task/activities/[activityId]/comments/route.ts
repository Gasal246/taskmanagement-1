import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import ActivityComments from "@/models/activity_comments.model";
import Users from "@/models/users.model";
import { authorizeActivityViewer } from "@/app/api/helpers/activity-comments";
import { notifyActivityComment } from "@/app/api/helpers/task-activity-comment-notifications";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

connectDB();

const unauthorized = (status: number) =>
  NextResponse.json({ message: status === 401 ? "Unauthorized" : "Forbidden" }, { status });

const serialize = (comment: any, seenIds: Set<string>, userId: string) => ({
  id: String(comment._id),
  activityId: String(comment.activity_id),
  taskId: String(comment.task_id),
  parentId: comment.parent_id ? String(comment.parent_id) : null,
  rootId: comment.root_id ? String(comment.root_id) : null,
  depth: comment.depth,
  body: comment.deleted_at ? "" : comment.body,
  deletedAt: comment.deleted_at || null,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  isSeen: String(comment.author_id?._id || comment.author_id) === userId || seenIds.has(String(comment._id)),
  canDelete: !comment.deleted_at && String(comment.author_id?._id || comment.author_id) === userId,
  author: {
    id: String(comment.author_id?._id || comment.author_id || ""),
    name: comment.author_id?.name || "Unknown user",
    avatarUrl: comment.author_id?.avatar_url || "",
  },
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return unauthorized(401);
  const { activityId } = await context.params;
  if (!mongoose.isValidObjectId(activityId)) return NextResponse.json({ message: "Invalid activity" }, { status: 400 });

  const access = await authorizeActivityViewer(userId, activityId);
  if (access.status !== 200) return unauthorized(access.status);

  const comments: any[] = await ActivityComments.find({ activity_id: activityId })
    .sort({ createdAt: 1 })
    .populate({ path: "author_id", select: "name avatar_url" })
    .lean();
  const reads = await ActivityCommentReads.find({
    user_id: userId,
    comment_id: { $in: comments.map((comment) => comment._id) },
  }).select("comment_id").lean();
  const seenIds = new Set(reads.map((read: any) => String(read.comment_id)));
  return NextResponse.json({ comments: comments.map((comment) => serialize(comment, seenIds, userId)) });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return unauthorized(401);
  const { activityId } = await context.params;
  if (!mongoose.isValidObjectId(activityId)) return NextResponse.json({ message: "Invalid activity" }, { status: 400 });

  const access = await authorizeActivityViewer(userId, activityId);
  if (access.status !== 200) return unauthorized(access.status);
  const payload = await req.json();
  const body = String(payload?.body || "").trim();
  if (!body || body.length > 2000) {
    return NextResponse.json({ message: "Comment must contain 1–2000 characters" }, { status: 400 });
  }

  let parent: any = null;
  if (payload?.parentId) {
    if (!mongoose.isValidObjectId(payload.parentId)) return NextResponse.json({ message: "Invalid parent comment" }, { status: 400 });
    parent = await ActivityComments.findOne({ _id: payload.parentId, activity_id: activityId }).lean();
    if (!parent) return NextResponse.json({ message: "Parent comment not found" }, { status: 404 });
    if (parent.deleted_at) return NextResponse.json({ message: "Cannot reply to a deleted comment" }, { status: 409 });
    if (parent.depth >= 2) return NextResponse.json({ message: "Maximum reply depth reached" }, { status: 400 });
  }

  const created = await ActivityComments.create({
    task_id: access.task._id,
    activity_id: activityId,
    author_id: userId,
    parent_id: parent?._id || null,
    root_id: parent ? parent.root_id || parent._id : null,
    depth: parent ? parent.depth + 1 : 0,
    body,
  });
  const populated: any = await ActivityComments.findById(created._id)
    .populate({ path: "author_id", select: "name avatar_url" })
    .lean();
  const actor = await Users.findById(userId).select("name avatar_url").lean();
  if (actor) {
    try {
      await notifyActivityComment({
        task: access.task,
        activity: access.activity,
        comment: created,
        actor,
        action: parent ? "replied" : "commented",
      });
    } catch (error) {
      console.log("Failed to persist activity comment notifications", error);
    }
  }
  return NextResponse.json({ comment: serialize(populated, new Set(), userId) }, { status: 201 });
}

export const dynamic = "force-dynamic";
