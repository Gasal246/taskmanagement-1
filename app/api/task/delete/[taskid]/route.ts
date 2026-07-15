import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import ActivityComments from "@/models/activity_comments.model";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import { deleteActivityCommentAttachments } from "@/app/api/helpers/activity-comment-attachments";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ taskid: string }> }
) {
  try {
    const { taskid } = await context.params;
    if (!taskid) {
      return NextResponse.json({ message: "Please provide task_id" }, { status: 400 });
    }

    const task = await Business_Tasks.findById(taskid);
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const comments = await ActivityComments.find({ task_id: taskid })
      .select("_id attachment.storage_path")
      .lean();
    const commentIds = comments.map((comment: any) => comment._id);
    await deleteActivityCommentAttachments(comments);
    await Promise.all([
      Business_Tasks.findByIdAndDelete(taskid),
      Task_Activities.deleteMany({ task_id: taskid }),
      ActivityComments.deleteMany({ task_id: taskid }),
      ActivityCommentReads.deleteMany({ comment_id: { $in: commentIds } }),
    ]);

    return NextResponse.json({ message: "Task deleted", status: 200 }, { status: 200 });
  } catch (err) {
    console.log("error while deleting task", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
