import { auth } from "@/auth";
import { addTaskAssignmentSummaries } from "@/app/api/helpers/task-assignment-summary";
import {
  getTaskStatusAggregationStages,
  getTaskStatusMatchStages,
  isTaskStatusFilter,
  normalizeTaskSummary,
} from "@/app/api/helpers/task-list-status";
import {
  escapeRegex,
  getBusinessHeads,
  getRoleNameFromRequest,
} from "@/app/api/helpers/task-filter-scope";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import connectDB from "@/lib/mongo";
import ActivityComments from "@/models/activity_comments.model";
import Business_staffs from "@/models/business_staffs.model";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import type { StaffTaskStatusFilter } from "@/types/staff-tasks";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const toObjectId = (value: unknown) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));

const parseDate = (value: string | null) => {
  if (!value || value === "undefined" || value === "null") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session?.user?.id || !mongoose.isValidObjectId(session.user.id)) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id") || "";
    const typeParam = searchParams.get("type");
    const type =
      typeParam === "single" || typeParam === "project" || typeParam === "admin-created"
        ? typeParam
        : "all";
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const nameQuery = (searchParams.get("nameQuery") || "").trim();
    const staffId = (searchParams.get("staffId") || "").trim();
    const assignedById = (searchParams.get("assignedById") || "").trim();
    const statusParam = (searchParams.get("status") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));
    const skip = (page - 1) * limit;

    if (!businessId || !mongoose.isValidObjectId(businessId)) {
      return NextResponse.json({ message: "Valid business_id is required", status: 400 }, { status: 400 });
    }
    if (statusParam && !isTaskStatusFilter(statusParam)) {
      return NextResponse.json({ message: "Invalid task status filter", status: 400 }, { status: 400 });
    }
    if (staffId && !mongoose.isValidObjectId(staffId)) {
      return NextResponse.json({ message: "Invalid staff filter", status: 400 }, { status: 400 });
    }
    if (assignedById && !mongoose.isValidObjectId(assignedById)) {
      return NextResponse.json({ message: "Invalid assigned-by filter", status: 400 }, { status: 400 });
    }

    const activeBusinessId = await resolveActiveBusinessIdForUser(session.user.id);
    if (
      activeBusinessId !== businessId ||
      !getRoleNameFromRequest(req).includes("ADMIN")
    ) {
      return NextResponse.json({ message: "Unauthorized Access", status: 403 }, { status: 403 });
    }

    const [allowedStaff, businessHeads] = await Promise.all([
      staffId
        ? Business_staffs.exists({ business_id: businessId, user_id: staffId, status: 1 })
        : Promise.resolve(true),
      assignedById ? getBusinessHeads(businessId) : Promise.resolve([]),
    ]);
    if (!allowedStaff) {
      return NextResponse.json({ message: "Staff filter is not permitted", status: 403 }, { status: 403 });
    }
    if (assignedById && !businessHeads.some((head) => head.id === assignedById)) {
      return NextResponse.json({ message: "Assigned-by filter is not permitted", status: 403 }, { status: 403 });
    }

    const businessObjectId = toObjectId(businessId);
    const adminObjectId = toObjectId(session.user.id);
    const staffObjectId = staffId ? toObjectId(staffId) : null;
    const assignedByObjectId = assignedById ? toObjectId(assignedById) : null;
    const query: Record<string, any> = { business_id: businessObjectId };

    if (type === "single") query.is_project_task = false;
    if (type === "project") query.is_project_task = true;
    if (type === "admin-created") query.creator = adminObjectId;
    if (startDate || endDate) {
      query.start_date = {};
      if (startDate) query.start_date.$gte = startDate;
      if (endDate) query.start_date.$lte = endDate;
    }
    if (assignedByObjectId) {
      query.$and = [...(query.$and || []), { creator: assignedByObjectId }];
    }

    const nameRegex = nameQuery ? new RegExp(escapeRegex(nameQuery), "i") : null;
    const [nameActivityMatches, staffActivityMatches] = await Promise.all([
      nameRegex
        ? Task_Activities.find({ activity: nameRegex }).select("task_id").lean()
        : Promise.resolve([]),
      staffObjectId
        ? Task_Activities.find({ assigned_to: staffObjectId }).select("task_id").lean()
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

    const taskRows = result?.data || [];
    const taskIds = taskRows.map((task: any) => task._id);
    const [tasksWithAssignments, commentCounts] = await Promise.all([
      addTaskAssignmentSummaries(taskRows),
      taskIds.length
        ? ActivityComments.aggregate([
            {
              $match: {
                task_id: { $in: taskIds },
                deleted_at: null,
              },
            },
            { $group: { _id: "$task_id", count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);
    const commentCountByTask = new Map(
      commentCounts.map((row: any) => [
        row._id.toString(),
        Number(row.count || 0),
      ])
    );
    const nameActivitySet = new Set(nameActivityIds.map((id) => id.toString()));
    const staffActivitySet = new Set(staffActivityIds.map((id) => id.toString()));
    const total = result?.pagination?.[0]?.total || 0;

    return NextResponse.json({
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
          comment_count: commentCountByTask.get(taskId) || 0,
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
            assignedByMatched: Boolean(
              assignedByObjectId && task.creator?.toString() === assignedById
            ),
          },
        };
      }),
      summary: normalizeTaskSummary(result?.summary || []),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statusAsOf: new Date().toISOString(),
      status: 200,
    });
  } catch (error) {
    console.log("Error while fetching admin task overview", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
