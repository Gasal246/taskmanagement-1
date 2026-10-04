import { inTransaction } from "@/lib/jobs/transaction";
import { enqueueFileCleanup } from "@/lib/jobs/enqueue";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import ActivityComments from "@/models/activity_comments.model";
import { authorizeActivityViewer } from "@/app/api/helpers/activity-comments";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  const userId = resolveSessionUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { commentId } = await context.params;
  if (!mongoose.isValidObjectId(commentId)) return NextResponse.json({ message: "Invalid comment" }, { status: 400 });
  await connectDB();
  const comment: any = await ActivityComments.findById(commentId);
  if (!comment) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  const access = await authorizeActivityViewer(userId, String(comment.activity_id), req);
  if (access.status !== 200) return NextResponse.json({ message: "Forbidden" }, { status: access.status });
  if (String(comment.author_id) !== userId) return NextResponse.json({ message: "You can only delete your own comments" }, { status: 403 });
  try {
    comment.deleted_at = await inTransaction(async dbSession => {
      const current: any = await ActivityComments.findById(commentId).session(dbSession);
      if (!current) return comment.deleted_at || new Date();
      if (current.deleted_at) return current.deleted_at;
      const deletedAt = new Date();
      await ActivityComments.updateOne({ _id: current._id }, {
        $set: { body: "", deleted_at: deletedAt, attachment: null },
      }, { session: dbSession });
      await enqueueFileCleanup([current.attachment?.storage_path], dbSession);
      return deletedAt;
    });
  } catch (error) {
    console.error("Failed to delete activity comment", error);
    return NextResponse.json({ message: "Could not delete the comment. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ commentId, deletedAt: comment.deleted_at });
}

export const dynamic = "force-dynamic";
