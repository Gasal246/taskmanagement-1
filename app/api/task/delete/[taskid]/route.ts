import { inTransaction } from "@/lib/jobs/transaction";
import { enqueueFileCleanup } from "@/lib/jobs/enqueue";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import ActivityComments from "@/models/activity_comments.model";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessBusiness, canAdministerBusiness } from "@/lib/server-access";
import mongoose from "mongoose";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ taskid: string }> }
) {
  try {
        await connectDB();
    const { taskid } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    if (!mongoose.isValidObjectId(taskid)) {
      return NextResponse.json({ message: "Please provide task_id" }, { status: 400 });
    }

    const task = await Business_Tasks.findById(taskid);
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }
    const allowed = session.user.is_super || await canAdministerBusiness(session.user.id, task.business_id) ||
      (String(task.creator) === session.user.id && await canAccessBusiness(session.user.id, task.business_id));
    if (!allowed) return NextResponse.json({ message: "Task deletion is not permitted", status: 403 }, { status: 403 });

    await inTransaction(async dbSession => {
      const removed = await Business_Tasks.findByIdAndDelete(taskid, { session: dbSession });
      if (!removed) return true;
      const comments = await ActivityComments.find({ task_id: taskid }).select("_id attachment.storage_path").session(dbSession).lean();
      const commentIds = comments.map((comment: any) => comment._id);
      const activities = await Task_Activities.find({ task_id: taskid }).select("documents").session(dbSession).lean();
      await Task_Activities.deleteMany({ task_id: taskid }, { session: dbSession });
      await ActivityComments.deleteMany({ task_id: taskid }, { session: dbSession });
      await ActivityCommentReads.deleteMany({ comment_id: { $in: commentIds } }, { session: dbSession });
      await enqueueFileCleanup([
        ...comments.map((comment: any) => comment.attachment?.storage_path),
        ...activities.flatMap((activity: any) => (activity.documents || []).map((document: any) => document.storagePath)),
      ], dbSession);
      return true;
    });

    return NextResponse.json({ message: "Task deleted", status: 200 }, { status: 200 });
  } catch (err) {
    console.log("error while deleting task", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
