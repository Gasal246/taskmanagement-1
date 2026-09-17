import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import Task_Activities from "@/models/task_activities.model";
import Business_Tasks from "@/models/business_tasks.model";
import { deadlineChangeSchema } from "@/lib/activity-deadline";
import { canEditActivitySchedule } from "@/app/api/helpers/activity-schedule-access";
import { updateActivitySchedule } from "@/app/api/helpers/activity-schedule-update";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { activityId } = await params;
    if (!mongoose.isValidObjectId(activityId)) return NextResponse.json({ message: "Invalid activity" }, { status: 400 });
    await connectDB({ throwOnError: true });
    const [current, actor] = await Promise.all([
      Task_Activities.findById(activityId).lean<any>(),
      Users.findById(session.user.id).select("name status").lean<any>(),
    ]);
    if (!current) return NextResponse.json({ message: "Activity not found" }, { status: 404 });
    const task = await Business_Tasks.findById(current.task_id).lean();
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    if (!actor || !(await canEditActivitySchedule(req, task, actor))) {
      return NextResponse.json({ message: "You cannot change this activity's deadline" }, { status: 403 });
    }
    const body = deadlineChangeSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ message: "Provide a valid new deadline and the current schedule" }, { status: 400 });
    if (!current.start_date || !current.end_date) {
      return NextResponse.json({ message: "Set the full schedule through Edit Activity first" }, { status: 400 });
    }
    const result = await updateActivitySchedule({
      current, actor,
      body: { ...body.data, start_date: new Date(current.start_date).toISOString() },
    });
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Error changing activity deadline", error);
    return NextResponse.json({ message: "Unable to change the deadline" }, { status: 500 });
  }
}
