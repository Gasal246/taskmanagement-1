import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { taskid: string } }
) {
  try {
    const { taskid } = params;
    if (!taskid) {
      return NextResponse.json({ message: "Please provide task_id" }, { status: 400 });
    }

    const deletedTask = await Business_Tasks.findByIdAndDelete(taskid);
    if (!deletedTask) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    await Task_Activities.deleteMany({ task_id: taskid });

    return NextResponse.json({ message: "Task deleted", status: 200 }, { status: 200 });
  } catch (err) {
    console.log("error while deleting task", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
