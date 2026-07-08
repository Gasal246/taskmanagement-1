import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Teams from "@/models/project_team.model";
import Task_Activities from "@/models/task_activities.model";
import Team_Members from "@/models/team_members.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session)
      return NextResponse.json(
        { message: "Un-Authorized Access", status: 401 },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("taskType");
    const type = typeParam === "single" || typeParam === "project" ? typeParam : "all";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const hasValidStart = Boolean(startDate && startDate !== "undefined");
    const hasValidEnd = Boolean(endDate && endDate !== "undefined");
    const hasType = Boolean(typeParam);
    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = Math.min(50, Math.max(1, Number(limitRaw) || 12));
    const skip = (page - 1) * limit;

    // ✅ Prevent fetching everything if no filters are provided
    if (!hasType && !hasValidStart && !hasValidEnd) {
      return NextResponse.json(
        { message: "No filters provided", data: [], status: 203 },
        { status: 203 }
      );
    }

    const query: any = {};

    // 📅 Date Filter
    if (hasValidStart || hasValidEnd) {
      query.start_date = {};
      if (hasValidStart && startDate)
        query.start_date.$gte = new Date(startDate);
      if (hasValidEnd && endDate)
        query.start_date.$lte = new Date(endDate);
    }

    const userId = session?.user?.id;
    const [teams, headOfTasks, activityTaskIds] = await Promise.all([
      Team_Members.find({ user_id: userId }).select("team_id").lean(),
      Project_Teams.find({ team_head: userId }).select("_id").lean(),
      Task_Activities.distinct("task_id", { assigned_to: userId }),
    ]);

    const teamIds = [
      ...teams.map((t: any) => t.team_id).filter(Boolean),
      ...headOfTasks.map((head: any) => head._id).filter(Boolean),
    ];

    if (type === "single") {
      query.is_project_task = false;
      query.$or = [
        { assigned_to: userId },
        { creator: userId },
        { _id: { $in: activityTaskIds } },
      ];
    } else if (type === "project") {
      query.is_project_task = true;
      query.$or = [
        { assigned_teams: { $in: teamIds } },
        { _id: { $in: activityTaskIds } },
      ];
    } else if (type === "all") {
      query.$or = [
        { assigned_to: userId },
        { creator: userId },
        { assigned_teams: { $in: teamIds } },
        { _id: { $in: activityTaskIds } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Business_Tasks.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Business_Tasks.countDocuments(query),
    ]);

    return NextResponse.json({
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      status: 200,
    }, { status: 200 });
  } catch (err) {
    console.log("Error while fetching All Task: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
