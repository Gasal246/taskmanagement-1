import { auth } from "@/auth";
import {
  canManageProjectTaskActivities,
  getProjectTaskCandidateIds,
} from "@/app/api/helpers/project-task-teams";
import connectDB from "@/lib/mongo";
import BusinessTasks from "@/models/business_tasks.model";
import UserSkills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskid: string }> }
) {
  try {
    const session: any = await auth();
    const userId = String(session?.user?.id || "");
    const { taskid } = await params;
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!mongoose.isValidObjectId(taskid)) {
      return NextResponse.json({ message: "Invalid task" }, { status: 400 });
    }
    const task: any = await BusinessTasks.findById(taskid)
      .select("project_id business_id creator is_project_task assigned_teams")
      .lean();
    if (!task || !task.is_project_task) {
      return NextResponse.json({ message: "Project task not found" }, { status: 404 });
    }
    if (!(await canManageProjectTaskActivities(task, userId))) {
      return NextResponse.json({ message: "You cannot assign activities for this task" }, { status: 403 });
    }

    let candidateIds = await getProjectTaskCandidateIds(task);
    const skillId = (new URL(req.url).searchParams.get("skill_id") || "").trim();
    if (skillId) {
      if (!mongoose.isValidObjectId(skillId)) {
        return NextResponse.json({ message: "Invalid skill" }, { status: 400 });
      }
      const skilledUserIds = await UserSkills.distinct("user_id", {
        user_id: { $in: candidateIds },
        skill_id: skillId,
        status: 1,
      });
      const allowed = new Set(skilledUserIds.map(String));
      candidateIds = candidateIds.filter((candidateId) => allowed.has(candidateId));
    }
    const users = await Users.find({ _id: { $in: candidateIds }, status: 1 })
      .select("name email avatar_url")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({
      data: users.map((user: any) => ({
        id: user._id.toString(),
        name: user.name || "Unknown user",
        email: user.email || "",
        avatar_url: user.avatar_url || null,
      })),
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching task assignment candidates", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
