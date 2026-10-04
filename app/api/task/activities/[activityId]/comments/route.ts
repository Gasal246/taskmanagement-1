import { inTransaction } from "@/lib/jobs/transaction";
import { assertUploadNotRetired } from "@/lib/jobs/enqueue";
import BusinessTasks from "@/models/business_tasks.model";
import TaskActivities from "@/models/task_activities.model";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import ActivityComments from "@/models/activity_comments.model";
import Users from "@/models/users.model";
import { authorizeActivityViewer, getActivityViewerIds } from "@/app/api/helpers/activity-comments";
import { notifyActivityComment } from "@/app/api/helpers/task-activity-comment-notifications";
import {
  AttachmentValidationError,
  validateActivityCommentAttachment,
} from "@/app/api/helpers/activity-comment-attachments";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

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
  attachment: comment.deleted_at || !comment.attachment ? null : {
    url: `/api/task/activity-files?commentId=${comment._id}`,
    name: comment.attachment.name,
    mimeType: comment.attachment.mime_type,
    extension: comment.attachment.extension,
    size: comment.attachment.size,
  },
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
  req: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return unauthorized(401);
  const { activityId } = await context.params;
  if (!mongoose.isValidObjectId(activityId)) return NextResponse.json({ message: "Invalid activity" }, { status: 400 });

  await connectDB();
  const access = await authorizeActivityViewer(userId, activityId, req);
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

  await connectDB();
  const access = await authorizeActivityViewer(userId, activityId, req);
  if (access.status !== 200) return unauthorized(access.status);
  const payload = await req.json();
  const body = String(payload?.body || "").trim();
  if (body.length > 2000) {
    return NextResponse.json({ message: "Comment cannot exceed 2000 characters" }, { status: 400 });
  }

  let parent: any = null;
  if (payload?.parentId) {
    if (!mongoose.isValidObjectId(payload.parentId)) return NextResponse.json({ message: "Invalid parent comment" }, { status: 400 });
    parent = await ActivityComments.findOne({ _id: payload.parentId, activity_id: activityId }).lean();
    if (!parent) return NextResponse.json({ message: "Parent comment not found" }, { status: 404 });
    if (parent.deleted_at) return NextResponse.json({ message: "Cannot reply to a deleted comment" }, { status: 409 });
    if (parent.depth >= 2) return NextResponse.json({ message: "Maximum reply depth reached" }, { status: 400 });
  }

  let attachment = null;
  if (payload?.attachment) {
    try {
        await connectDB();
      attachment = await validateActivityCommentAttachment(payload.attachment, {
        taskId: String(access.task._id),
        activityId,
        userId,
      });
    } catch (error) {
      if (error instanceof AttachmentValidationError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      console.log("Failed to validate activity comment attachment", error);
      return NextResponse.json({ message: "Could not validate the attachment" }, { status: 502 });
    }
  }
  if (!body && !attachment) {
    return NextResponse.json({ message: "Add a comment or attachment" }, { status: 400 });
  }

  const actor = await Users.findById(userId).select("name avatar_url").lean();
  if (!actor) return unauthorized(401);
  const recipientIds = await getActivityViewerIds(access.task, access.activity);
  const commentId = new mongoose.Types.ObjectId();
  let created: any;
  try {
    created = await inTransaction(async dbSession => {
      // Touch the parent task to serialize against task/activity cascade deletion.
      const parentTask = await BusinessTasks.updateOne({ _id: access.task._id }, { $inc: { __v: 1 } }, { session: dbSession });
      if (!parentTask.matchedCount || !await TaskActivities.exists({ _id: activityId }).session(dbSession)) {
        throw new Error("Activity was deleted while adding a comment");
      }
      if (parent && !await ActivityComments.exists({ _id: parent._id, activity_id: activityId, deleted_at: null }).session(dbSession)) {
        throw new Error("Parent comment was deleted while replying");
      }
      if (attachment) await assertUploadNotRetired(attachment.storagePath, dbSession);
      const [comment] = await ActivityComments.create([{
        _id: commentId, task_id: access.task._id, activity_id: activityId, author_id: userId,
        parent_id: parent?._id || null, root_id: parent ? parent.root_id || parent._id : null,
        depth: parent ? parent.depth + 1 : 0, body,
        attachment: attachment ? { url: attachment.url, storage_path: attachment.storagePath,
          name: attachment.name, mime_type: attachment.mimeType, extension: attachment.extension, size: attachment.size,
        } : null,
      }], { session: dbSession });
      await notifyActivityComment({ task: access.task, activity: access.activity, comment, actor,
        action: parent ? "replied" : "commented", recipientIds, dbSession,
      });
      return comment;
    });
  } catch (error) {
    // Keep a failed upload available for the user's retry. Deleting it here could
    // race an unknown commit result; abandoned uploads need a separate retention policy.
    console.error("Failed to create activity comment", error);
    return NextResponse.json({ message: "Could not add the comment. Please try again." }, { status: 500 });
  }
  const populated: any = await ActivityComments.findById(created._id)
    .populate({ path: "author_id", select: "name avatar_url" }).lean();
  return NextResponse.json({ comment: serialize(populated, new Set(), userId) }, { status: 201 });
}

export const dynamic = "force-dynamic";
