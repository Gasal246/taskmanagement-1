import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import ActivityComments from "@/models/activity_comments.model";
import { authorizeActivityViewer } from "@/app/api/helpers/activity-comments";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

connectDB();

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { commentId } = await context.params;
  if (!mongoose.isValidObjectId(commentId)) return NextResponse.json({ message: "Invalid comment" }, { status: 400 });
  const comment: any = await ActivityComments.findById(commentId);
  if (!comment) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  const access = await authorizeActivityViewer(userId, String(comment.activity_id));
  if (access.status !== 200) return NextResponse.json({ message: "Forbidden" }, { status: access.status });
  if (String(comment.author_id) !== userId) return NextResponse.json({ message: "You can only delete your own comments" }, { status: 403 });
  if (!comment.deleted_at) {
    const deletedAt = new Date();
    await ActivityComments.updateOne(
      { _id: comment._id },
      { $set: { body: "", deleted_at: deletedAt } }
    );
    comment.deleted_at = deletedAt;
  }
  return NextResponse.json({ commentId, deletedAt: comment.deleted_at });
}

export const dynamic = "force-dynamic";
