import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { taskActivityFilterStages } from "@/lib/tasks/filter-pipeline";
import { pageBounds, escapeSearch } from "@/lib/search";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import ActivityComments from "@/models/activity_comments.model";
import Business_Project from "@/models/business_project.model";
import Project_Teams from "@/models/project_team.model";
import Task_Activities from "@/models/task_activities.model";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { addTaskAssignmentSummaries } from "@/app/api/helpers/task-assignment-summary";
import {
  getTaskStatusAggregationStages,
  getTaskStatusMatchStages,
  isTaskStatusFilter,
  normalizeTaskSummary,
} from "@/app/api/helpers/task-list-status";
import type { StaffTaskStatusFilter, TaskPriorityFilter } from "@/types/staff-tasks";

import { resolveSelectedHeadContext, getSelectedHeadDirectStaffIds } from "@/app/api/helpers/head-reassignment-scope";
const toObjectId = (value: unknown) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));

export async function GET(req: NextRequest) {
  try {
        await connectDB();
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
    const { page, limit, skip } = pageBounds(searchParams, 12, 50);
    const nameQuery = (searchParams.get("nameQuery") || "").trim();
    const staffId = (searchParams.get("staffId") || "").trim();
    const statusParam = (searchParams.get("status") || "").trim();
    const priorityParam = (searchParams.get("priority") || "").trim().toLowerCase();
    const hasValidStart = Boolean(startDate && startDate !== "undefined");
    const hasValidEnd = Boolean(endDate && endDate !== "undefined");
    const hasType = Boolean(typeParam);

    if (statusParam && !isTaskStatusFilter(statusParam)) {
      return NextResponse.json(
        { message: "Invalid task status filter", status: 400 },
        { status: 400 }
      );
    }

    if (priorityParam && !["high", "medium", "normal"].includes(priorityParam)) {
      return NextResponse.json(
        { message: "Invalid task priority filter", status: 400 },
        { status: 400 }
      );
    }

    if (
      !hasType &&
      !hasValidStart &&
      !hasValidEnd &&
      !nameQuery &&
      !staffId &&
      !statusParam &&
      !priorityParam
    ) {
      return NextResponse.json(
        { message: "No filters provided", data: [], status: 203 },
        { status: 203 }
      );
    }

    const headContext = await resolveSelectedHeadContext(req, userId);
    const headStaffIds = headContext ? await getSelectedHeadDirectStaffIds(headContext) : [];
    const supervisedActivityTaskIds = headStaffIds.length
      ? await Task_Activities.distinct("task_id", {
          $or: [{ assigned_to: { $in: headStaffIds } }, { forwarded_to: { $in: headStaffIds } }],
        })
      : [];
    const userObjectId = toObjectId(userId);
    const [headedTeams, operationProjects, accessibleActivityTaskIds] = await Promise.all([
      Project_Teams.find({ team_head: userId }).select("_id").lean(),
      Business_Project.find({
        $or: [
          { project_head: userObjectId },
          { project_heads: userObjectId },
          { project_supervisors: userObjectId },
          { account_managers: userObjectId },
          { site_operational_heads: userObjectId },
        ],
      }).select("_id").lean(),
      Task_Activities.distinct("task_id", {
        $or: [{ assigned_to: userId }, { forwarded_to: userId }],
      }),
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

    const headedTeamIds = headedTeams.map((team: any) => toObjectId(team._id));
    const operationProjectIds = operationProjects.map((project: any) => toObjectId(project._id));
    const activityTaskIds = accessibleActivityTaskIds.filter(Boolean).map(toObjectId);
    const staffObjectId = staffId ? toObjectId(staffId) : null;

    const supervisedStaffObjectIds = headStaffIds.map(toObjectId);
    const supervisedVisibility = headContext ? [{
      business_id: toObjectId(headContext.businessId),
      $or: [
        { is_project_task: false, assigned_to: { $in: supervisedStaffObjectIds } },
        { _id: { $in: supervisedActivityTaskIds.filter(Boolean).map(toObjectId) } },
      ],
    }] : [];
    const query: Record<string, any> = {};
    if (priorityParam) query.priority = priorityParam as TaskPriorityFilter;
    if (hasValidStart || hasValidEnd) {
      query.start_date = {};
      if (hasValidStart && startDate) query.start_date.$gte = new Date(startDate);
      if (hasValidEnd && endDate) query.start_date.$lte = new Date(endDate);
    }

    const individualVisibility = {
      $or: [
        { assigned_to: userObjectId },
        { creator: userObjectId },
        { _id: { $in: activityTaskIds } },
        ...supervisedVisibility,
      ],
    };
    const projectVisibility = {
      $or: [
        { creator: userObjectId },
        { project_id: { $in: operationProjectIds } },
        { assigned_teams: { $in: headedTeamIds } },
        { _id: { $in: activityTaskIds } },
        ...supervisedVisibility,
      ],
    };

    if (type === "single") query.is_project_task = false;
    if (type === "project") query.is_project_task = true;
    if (type === "created") query.creator = userObjectId;

    if (!staffObjectId) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { is_project_task: false, ...individualVisibility },
            { is_project_task: true, ...projectVisibility },
          ],
        },
      ];
    } else {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { is_project_task: { $ne: true }, ...individualVisibility },
            { is_project_task: true, ...projectVisibility },
          ],
        },
      ];
    }

    const fullActivityTaskIds = await Business_Tasks.distinct("_id", {
      $or: [
        ...(headContext ? [{ is_project_task: false, business_id: toObjectId(headContext.businessId), assigned_to: { $in: supervisedStaffObjectIds } }] : []),
        {
          is_project_task: false,
          $or: [{ assigned_to: userObjectId }, { creator: userObjectId }],
        },
        {
          is_project_task: true,
          $or: [
            { creator: userObjectId },
            { project_id: { $in: operationProjectIds } },
            { assigned_teams: { $in: headedTeamIds } },
          ],
        },
      ],
    });
    const visibleActivityScope = {
      $or: [
        { task_id: { $in: fullActivityTaskIds } },
        { assigned_to: userObjectId },
        { forwarded_to: userObjectId },
        { assigned_to: { $in: supervisedStaffObjectIds } },
        { forwarded_to: { $in: supervisedStaffObjectIds } },
      ],
    };

    const nameRegex = nameQuery ? new RegExp(escapeSearch(nameQuery), "i") : null;
    const activityFilterStages = taskActivityFilterStages(nameRegex, staffObjectId, visibleActivityScope);

    const now = new Date();
    const statusMatch = getTaskStatusMatchStages(
      statusParam ? (statusParam as StaffTaskStatusFilter) : undefined
    );

    const [result] = await Business_Tasks.aggregate([
      { $match: query },
      ...activityFilterStages,
      {
        $lookup: {
          from: Task_Activities.collection.name,
          localField: "_id",
          foreignField: "task_id",
          let: { taskId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $in: ["$$taskId", fullActivityTaskIds.map(toObjectId)] },
                    { $in: ["$assigned_to", supervisedStaffObjectIds] },
                    { $in: ["$forwarded_to", supervisedStaffObjectIds] },
                    { $eq: ["$assigned_to", userObjectId] },
                    { $eq: ["$forwarded_to", userObjectId] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$is_done", true] }, 1, 0] },
                },
              },
            },
          ],
          as: "__visibleActivityStats",
        },
      },
      {
        $set: {
          activity_count: {
            $ifNull: [
              { $arrayElemAt: ["$__visibleActivityStats.total", 0] },
              0,
            ],
          },
          completed_activity: {
            $ifNull: [
              { $arrayElemAt: ["$__visibleActivityStats.completed", 0] },
              0,
            ],
          },
        },
      },
      ...getTaskStatusAggregationStages(now),
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
                __nameActivityMatched: 1,
                __staffActivityMatched: 1,
                task_description: 1,
                createdAt: 1,
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
                    "$end_date",
                    "$$REMOVE",
                  ],
                },
                creator: 1,
                assigned_to: 1,
                project_id: 1,
                assigned_teams: 1,
              },
            },
          ],
        },
      },
    ]);

    const taskRows = result?.data || [];
    const taskIds = taskRows.map((task: any) => task._id);
    const operationProjectIdSet = new Set(operationProjectIds.map((projectId) => projectId.toString()));
    const headedTeamIdSet = new Set(headedTeamIds.map((teamId) => teamId.toString()));
    const fullActivityTaskIdSet = new Set(fullActivityTaskIds.map(String));
    const fullTaskIds = taskRows
      .filter((task: any) => {
        if (!task.is_project_task) return fullActivityTaskIdSet.has(String(task._id));
        if (task.creator?.toString() === userId) return true;
        if (operationProjectIdSet.has(task.project_id?.toString())) return true;
        const assignedTeams = Array.isArray(task.assigned_teams)
          ? task.assigned_teams
          : task.assigned_teams
            ? [task.assigned_teams]
            : [];
        return assignedTeams
          .some((teamId: any) => headedTeamIdSet.has(teamId?.toString()));
      })
      .map((task: any) => task._id);
    const fullTaskIdSet = new Set<string>(fullTaskIds.map((taskId: any) => taskId.toString()));
    const visibleActivityIds = taskIds.length
      ? await Task_Activities.distinct("_id", {
          task_id: { $in: taskIds },
          $or: [
            { task_id: { $in: fullTaskIds } },
            { assigned_to: userObjectId },
            { forwarded_to: userObjectId },
            { assigned_to: { $in: supervisedStaffObjectIds } },
            { forwarded_to: { $in: supervisedStaffObjectIds } },
          ],
        })
      : [];
    const [tasksWithAssignments, visibleActivityCommentStats] = await Promise.all([
      addTaskAssignmentSummaries(taskRows, {
        userId,
        fullTaskIds: Array.from(fullTaskIdSet),
      }),
      visibleActivityIds.length
        ? ActivityComments.aggregate([
            { $match: { activity_id: { $in: visibleActivityIds }, deleted_at: null } },
            { $group: { _id: "$task_id", comments: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);
    const visibleActivityCommentsByTask = new Map(
      visibleActivityCommentStats.map((stats: any) => [
        stats._id.toString(),
        Number(stats.comments || 0),
      ])
    );
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
            created_at: task.createdAt || null,
            end_date: task.end_date || null,
            is_project_task: Boolean(task.is_project_task),
            priority: task.priority || null,
            activity_count: Number(task.activity_count || 0),
            completed_activity: Number(task.completed_activity || 0),
            comment_count: visibleActivityCommentsByTask.get(taskId) || 0,
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
                  (task.__nameActivityMatched || nameRegex.test(task.task_name || ""))
              ),
              staffTaskAssigned: Boolean(
                staffObjectId && task.assigned_to?.toString() === staffId
              ),
              staffActivityAssigned: Boolean(
                staffObjectId && task.__staffActivityMatched
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
    const unavailable = temporaryDatabaseFailureResponse(err);
    if (unavailable) return unavailable;
    console.log("Error while fetching all staff tasks: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
