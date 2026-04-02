import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Teams from "@/models/project_team.model";
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
    const type = searchParams.get("taskType");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    const hasValidStart = Boolean(startDate && startDate !== "undefined");
    const hasValidEnd = Boolean(endDate && endDate !== "undefined");
    const hasType = Boolean(type);
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

    // 👥 Type Filter
    // Filter with Type
if (type === "single") {
  query.$or = [
    { assigned_to: session?.user?.id },
    { creator: session?.user?.id },
  ];
} 
else if (type === "project") {
  const teams = await Team_Members.find({ user_id: session?.user?.id });
  const headOfTasks = await Project_Teams.find({ team_head: session?.user?.id });

  const teamIds = [
    ...teams.map((t) => t.team_id),
    ...headOfTasks.map((head) => head._id),
  ];

  query.assigned_teams = { $in: teamIds };
} 
else if (type === "all") {
  // Combine all conditions
  const teams = await Team_Members.find({ user_id: session?.user?.id });
  const headOfTasks = await Project_Teams.find({ team_head: session?.user?.id });
  console.log("teamsHead: ", headOfTasks);

  const teamIds = [
    ...teams.map((t) => t.team_id),
    ...headOfTasks.map((head) => head._id),
  ];

  query.$or = [
    { assigned_to: session?.user?.id },
    { creator: session?.user?.id },
    { assigned_teams: { $in: teamIds } },
  ];
}


    console.log("task query: ", query);

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
