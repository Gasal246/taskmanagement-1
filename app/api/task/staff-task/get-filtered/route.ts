import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Teams from "@/models/project_team.model";
import Task_Activities from "@/models/task_activities.model";
import Team_Members from "@/models/team_members.model";
import { NextRequest, NextResponse } from "next/server";
import {
  escapeRegex,
  getHeadStaffIds,
  getRoleNameFromRequest,
} from "@/app/api/helpers/task-filter-scope";
import mongoose from "mongoose";
import { addTaskAssignmentSummaries } from "@/app/api/helpers/task-assignment-summary";
import {
  getTaskStatusAggregationStages,
  getTaskStatusMatchStages,
  isTaskStatusFilter,
  normalizeTaskSummary,
} from "@/app/api/helpers/task-list-status";
import type { StaffTaskStatusFilter } from "@/types/staff-tasks";

connectDB();

const toObjectId = (value: unknown) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json(
        { message: "Un-Authorized Access", status: 401 },
        { status: 401 }
      );
    }

    const userId = session?.user?.id;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return NextResponse.json(
        { message: "Invalid authenticated user", status: 401 },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("taskType");
    const type =
      typeParam === "single" || typeParam === "project" || typeParam === "created"
        ? typeParam
        : "all";
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));
    const nameQuery = (searchParams.get("nameQuery") || "").trim();
    const staffId = (searchParams.get("staffId") || "").trim();
    const statusParam = (searchParams.get("status") || "").trim();
    const hasValidStart = Boolean(startDate && startDate !== "undefined");
    const hasValidEnd = Boolean(endDate && endDate !== "undefined");
    const hasType = Boolean(typeParam);
    const skip = (page - 1) * limit;

    if (statusParam && !isTaskStatusFilter(statusParam)) {
      return NextResponse.json(
        { message: "Invalid task status filter", status: 400 },
        { status: 400 }
      );
    }

    if (
      !hasType &&
      !hasValidStart &&
      !hasValidEnd &&
      !nameQuery &&
      !staffId &&
      !statusParam
    ) {
      return NextResponse.json(
        { message: "No filters provided", data: [], status: 203 },
        { status: 203 }
      );
    }

    const roleName = getRoleNameFromRequest(req);
    const userObjectId = toObjectId(userId);
    const [teams, headedTeams, accessibleActivityTaskIds, headStaffIds] = await Promise.all([
      Team_Members.find({ user_id: userId }).select("team_id").lean(),
      Project_Teams.find({ team_head: userId }).select("_id").lean(),
      Task_Activities.distinct("task_id", {
        $or: [{ assigned_to: userId }, { forwarded_to: userId }],
      }),
      staffId ? getHeadStaffIds(userId, roleName) : Promise.resolve([]),
    ]);

    if (
      staffId &&
      (!mongoose.isValidObjectId(staffId) || !headStaffIds.includes(staffId))
    ) {
      return NextResponse.json(
        { message: "Staff filter is not permitted", status: 403 },
        { status: 403 }
      );
    }

    const teamIds = [
      ...teams.map((team: any) => team.team_id).filter(Boolean),
      ...headedTeams.map((team: any) => team._id).filter(Boolean),
    ].map(toObjectId);
    const activityTaskIds = accessibleActivityTaskIds.filter(Boolean).map(toObjectId);
    const staffObjectId = staffId ? toObjectId(staffId) : null;

    const query: Record<string, any> = {};
    if (hasValidStart || hasValidEnd) {
      query.start_date = {};
      if (hasValidStart && startDate) query.start_date.$gte = new Date(startDate);
      if (hasValidEnd && endDate) query.start_date.$lte = new Date(endDate);
    }

    if (staffObjectId) {
      if (type === "single") query.is_project_task = false;
      if (type === "project") query.is_project_task = true;
      if (type === "created") query.creator = userObjectId;
    } else if (type === "single") {
      query.is_project_task = false;
      query.$or = [
        { assigned_to: userObjectId },
        { creator: userObjectId },
        { _id: { $in: activityTaskIds } },
      ];
    } else if (type === "project") {
      query.is_project_task = true;
      query.$or = [
        { assigned_teams: { $in: teamIds } },
        { _id: { $in: activityTaskIds } },
      ];
    } else if (type === "created") {
      query.creator = userObjectId;
    } else {
      query.$or = [
        { assigned_to: userObjectId },
        { creator: userObjectId },
        { assigned_teams: { $in: teamIds } },
        { _id: { $in: activityTaskIds } },
      ];
    }

    const nameRegex = nameQuery ? new RegExp(escapeRegex(nameQuery), "i") : null;
    const [nameActivityMatches, staffActivityMatches] = await Promise.all([
      nameRegex
        ? Task_Activities.find({ activity: nameRegex }).select("task_id").lean()
        : Promise.resolve([]),
      staffObjectId
        ? Task_Activities.find({
            $or: [{ assigned_to: staffObjectId }, { forwarded_to: staffObjectId }],
          })
            .select("task_id")
            .lean()
        : Promise.resolve([]),
    ]);

    const nameActivityIds = nameActivityMatches
      .map((item: any) => item.task_id)
      .filter(Boolean)
      .map(toObjectId);
    const staffActivityIds = staffActivityMatches
      .map((item: any) => item.task_id)
      .filter(Boolean)
      .map(toObjectId);

    if (nameRegex) {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ task_name: nameRegex }, { _id: { $in: nameActivityIds } }] },
      ];
    }
    if (staffObjectId) {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ assigned_to: staffObjectId }, { _id: { $in: staffActivityIds } }] },
      ];
    }

    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);
    const statusMatch = getTaskStatusMatchStages(
      statusParam ? (statusParam as StaffTaskStatusFilter) : undefined
    );

    const [result] = await Business_Tasks.aggregate([
      { $match: query },
      ...getTaskStatusAggregationStages(todayStartUtc),
      {
        $facet: {
          summary: [
            { $match: { __displayStatus: { $ne: "Cancelled" } } },
            { $group: { _id: "$__displayStatus", count: { $sum: 1 } } },
          ],
          pagination: [...statusMatch, { $count: "total" }],
          data: [
            ...statusMatch,
            { $sort: { updatedAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                task_name: 1,
                task_description: 1,
                end_date: 1,
                is_project_task: 1,
                priority: 1,
                activity_count: "$__activityCount",
                completed_activity: "$__completedCount",
                progress: "$__progress",
                status: "$__displayStatus",
                pending_since: {
                  $cond: [
                    { $eq: ["$__displayStatus", "Pending"] },
                    { $dateAdd: { startDate: "$end_date", unit: "day", amount: 1 } },
                    "$$REMOVE",
                  ],
                },
                creator: 1,
                assigned_to: 1,
              },
            },
          ],
        },
      },
    ]);

    const tasksWithAssignments = await addTaskAssignmentSummaries(result?.data || []);
    const nameActivitySet = new Set(nameActivityIds.map((id) => id.toString()));
    const staffActivitySet = new Set(staffActivityIds.map((id) => id.toString()));
    const summary = normalizeTaskSummary(result?.summary || []);

    const total = result?.pagination?.[0]?.total || 0;
    return NextResponse.json(
      {
        data: tasksWithAssignments.map((task: any) => {
          const taskId = task._id.toString();
          const firstAssignee = task.assignment?.assignedTo?.[0] || null;
          return {
            _id: taskId,
            task_name: task.task_name || "",
            task_description: task.task_description || "",
            end_date: task.end_date || null,
            is_project_task: Boolean(task.is_project_task),
            priority: task.priority || null,
            activity_count: Number(task.activity_count || 0),
            completed_activity: Number(task.completed_activity || 0),
            progress: Number(task.progress || 0),
            status: task.status,
            pending_since: task.pending_since || null,
            assignment: {
              assignedByName: task.assignment?.assignedBy?.name || null,
              assignedToName: firstAssignee?.name || null,
              assignedToCount: task.assignment?.assignedTo?.length || 0,
            },
            match: {
              nameMatched: Boolean(
                nameRegex &&
                  (nameActivitySet.has(taskId) || nameRegex.test(task.task_name || ""))
              ),
              staffTaskAssigned: Boolean(
                staffObjectId && task.assigned_to?.toString() === staffId
              ),
              staffActivityAssigned: Boolean(
                staffObjectId && staffActivitySet.has(taskId)
              ),
            },
          };
        }),
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        statusAsOf: new Date().toISOString(),
        status: 200,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log("Error while fetching all staff tasks: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
