import { addTaskAssignmentSummaries } from "@/app/api/helpers/task-assignment-summary";
import {
  getTaskStatusAggregationStages,
  getTaskStatusMatchStages,
  isTaskStatusFilter,
  normalizeTaskSummary,
} from "@/app/api/helpers/task-list-status";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";
import { escapeRegex } from "@/app/api/helpers/task-filter-scope";
import connectDB from "@/lib/mongo";
import ActivityComments from "@/models/activity_comments.model";
import BusinessTasks from "@/models/business_tasks.model";
import FlowLog from "@/models/Flow_Log.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import ProjectTeams from "@/models/project_team.model";
import TaskActivities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import type { StaffTaskStatusFilter } from "@/types/staff-tasks";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const id = (value: any) => value?._id?.toString?.() || value?.toString?.() || "";
const oid = (value: string) => new mongoose.Types.ObjectId(value);
const TASK_PRIORITIES = new Set(["high", "medium", "normal"]);

const parseDate = (value: string | null, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
};

const parseRequiredDate = (value: unknown) => {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) return null;
  return date;
};

async function getTeamOptions(projectId: string, userId: string, allTeams: boolean) {
  return ProjectTeams.find({
    project_id: projectId,
    ...(allTeams ? {} : { team_head: userId }),
  })
    .select("team_name team_head members_count")
    .populate({ path: "team_head", select: "name email avatar_url" })
    .sort({ team_name: 1 })
    .lean();
}

async function getPeopleForTeams(teamIds: any[]) {
  if (!teamIds.length) return [];
  const [teams, memberships] = await Promise.all([
    ProjectTeams.find({ _id: { $in: teamIds } }).select("team_head").lean(),
    ProjectTeamMembers.find({ project_team_id: { $in: teamIds } })
      .select("user_id")
      .lean(),
  ]);
  const userIds = Array.from(new Set([
    ...teams.map((team: any) => id(team.team_head)),
    ...memberships.map((member: any) => id(member.user_id)),
  ].filter(Boolean)));
  return Users.find({ _id: { $in: userIds }, status: 1 })
    .select("name email avatar_url")
    .sort({ name: 1 })
    .lean();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectid: string }> }) {
  try {
    const { projectid } = await params;
    if (!mongoose.isValidObjectId(projectid)) {
      return NextResponse.json({ message: "Invalid project", status: 400 }, { status: 400 });
    }
    const authorization = await authorizeProjectRequest(projectid, "view");
    if (!authorization.ok) return authorization.response;
    const { access, userId } = authorization;
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "").trim();
    const nameQuery = (searchParams.get("nameQuery") || "").trim();
    const personId = (searchParams.get("personId") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 9));
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"), true);

    if (status && !isTaskStatusFilter(status)) {
      return NextResponse.json({ message: "Invalid task status", status: 400 }, { status: 400 });
    }
    if (personId && !mongoose.isValidObjectId(personId)) {
      return NextResponse.json({ message: "Invalid person filter", status: 400 }, { status: 400 });
    }

    const projectObjectId = oid(projectid);
    const userObjectId = oid(userId);
    const query: Record<string, any> = {
      project_id: projectObjectId,
      is_project_task: true,
    };
    const hasProjectWideVisibility = access.isAdmin || access.isProjectOperations;
    const [headedTeams, activityTaskIds] = hasProjectWideVisibility
      ? [[], []]
      : await Promise.all([
        ProjectTeams.find({ project_id: projectObjectId, team_head: userObjectId })
          .select("_id")
          .lean(),
        TaskActivities.distinct("task_id", {
        $or: [{ assigned_to: userObjectId }, { forwarded_to: userObjectId }],
        }),
      ]);
    const headedTeamIds = headedTeams.map((team: any) => team._id);
    const fullVisibleTaskIds = hasProjectWideVisibility
      ? []
      : await BusinessTasks.distinct("_id", {
          project_id: projectObjectId,
          is_project_task: true,
          $or: [
            { creator: userObjectId },
            { assigned_teams: { $in: headedTeamIds } },
          ],
        });
    if (!hasProjectWideVisibility) {
      query.$and = [{
        $or: [
          { _id: { $in: fullVisibleTaskIds } },
          { _id: { $in: activityTaskIds } },
        ],
      }];
    }
    if (startDate || endDate) {
      query.start_date = {};
      if (startDate) query.start_date.$gte = startDate;
      if (endDate) query.start_date.$lte = endDate;
    }

    const nameRegex = nameQuery ? new RegExp(escapeRegex(nameQuery), "i") : null;
    const visibleActivityScope = hasProjectWideVisibility
      ? {}
      : {
          $or: [
            { task_id: { $in: fullVisibleTaskIds } },
            { assigned_to: userObjectId },
            { forwarded_to: userObjectId },
          ],
        };
    const [nameActivities, personActivities] = await Promise.all([
      nameRegex
        ? TaskActivities.find({ $and: [{ activity: nameRegex }, visibleActivityScope] }).select("task_id").lean()
        : Promise.resolve([]),
      personId
        ? TaskActivities.find({
            $and: [
              { $or: [{ assigned_to: oid(personId) }, { forwarded_to: oid(personId) }] },
              visibleActivityScope,
            ],
          }).select("task_id").lean()
        : Promise.resolve([]),
    ]);
    const nameActivityIds = nameActivities.map((row: any) => row.task_id).filter(Boolean);
    const personActivityIds = personActivities.map((row: any) => row.task_id).filter(Boolean);
    if (nameRegex) {
      query.$and = [...(query.$and || []), {
        $or: [{ task_name: nameRegex }, { _id: { $in: nameActivityIds } }],
      }];
    }
    if (personId) {
      query.$and = [...(query.$and || []), { _id: { $in: personActivityIds } }];
    }

    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);
    const statusStages = getTaskStatusMatchStages(status as StaffTaskStatusFilter || undefined);
    const scopedActivityStages = hasProjectWideVisibility
      ? []
      : [
          {
            $lookup: {
              from: TaskActivities.collection.name,
              let: { taskId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$task_id", "$$taskId"] },
                        {
                          $or: [
                            { $in: ["$$taskId", fullVisibleTaskIds] },
                            { $eq: ["$assigned_to", userObjectId] },
                            { $eq: ["$forwarded_to", userObjectId] },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$is_done", true] }, 1, 0] } },
                  },
                },
              ],
              as: "__visibleActivityStats",
            },
          },
          {
            $set: {
              activity_count: { $ifNull: [{ $arrayElemAt: ["$__visibleActivityStats.total", 0] }, 0] },
              completed_activity: { $ifNull: [{ $arrayElemAt: ["$__visibleActivityStats.completed", 0] }, 0] },
            },
          },
        ];
    const [result] = await BusinessTasks.aggregate([
      { $match: query },
      ...scopedActivityStages,
      ...getTaskStatusAggregationStages(todayStartUtc),
      {
        $facet: {
          summary: [
            { $match: { __displayStatus: { $ne: "Cancelled" } } },
            { $group: { _id: "$__displayStatus", count: { $sum: 1 } } },
          ],
          pagination: [...statusStages, { $count: "total" }],
          data: [
            ...statusStages,
            { $sort: { updatedAt: -1, _id: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: {
              task_name: 1,
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
                  { $dateAdd: { startDate: "$end_date", unit: "day", amount: 1 } },
                  "$$REMOVE",
                ],
              },
              creator: 1,
              assigned_to: 1,
              assigned_teams: 1,
            } },
          ],
        },
      },
    ]);

    const rows = result?.data || [];
    const taskIds = rows.map((task: any) => task._id);
    const fullVisibleTaskIdSet = new Set(fullVisibleTaskIds.map(id));
    const fullRowTaskIds = hasProjectWideVisibility
      ? taskIds
      : taskIds.filter((taskId: any) => fullVisibleTaskIdSet.has(id(taskId)));
    const visibleActivityIds = taskIds.length
      ? await TaskActivities.distinct("_id", hasProjectWideVisibility
          ? { task_id: { $in: taskIds } }
          : {
              task_id: { $in: taskIds },
              $or: [
                { task_id: { $in: fullRowTaskIds } },
                { assigned_to: userObjectId },
                { forwarded_to: userObjectId },
              ],
            })
      : [];
    const [withAssignments, commentCounts, allTeams, creationTeams] = await Promise.all([
      addTaskAssignmentSummaries(rows, {
        userId,
        fullTaskIds: fullRowTaskIds.map(id),
      }),
      visibleActivityIds.length
        ? ActivityComments.aggregate([
            { $match: { activity_id: { $in: visibleActivityIds }, deleted_at: null } },
            { $group: { _id: "$task_id", count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      getTeamOptions(projectid, userId, true),
      access.canCreateTasks
        ? getTeamOptions(projectid, userId, access.canViewAllTeams)
        : Promise.resolve([]),
    ]);
    const comments = new Map(commentCounts.map((row: any) => [id(row._id), Number(row.count || 0)]));
    const people = await getPeopleForTeams(allTeams.map((team: any) => team._id));
    const total = Number(result?.pagination?.[0]?.total || 0);
    const nameMatches = new Set(nameActivityIds.map(id));
    const personMatches = new Set(personActivityIds.map(id));
    const teamById = new Map(
      allTeams.map((team: any) => [id(team._id), team.team_name || "Unnamed team"])
    );

    return NextResponse.json({
      data: withAssignments.map((task: any) => ({
        _id: id(task._id),
        task_name: task.task_name || "",
        task_description: task.task_description || "",
        created_at: task.createdAt || null,
        end_date: task.end_date || null,
        is_project_task: true,
        priority: task.priority || null,
        activity_count: Number(task.activity_count || 0),
        completed_activity: Number(task.completed_activity || 0),
        comment_count: comments.get(id(task._id)) || 0,
        progress: Number(task.progress || 0),
        status: task.status,
        pending_since: task.pending_since || null,
        teams: (Array.isArray(task.assigned_teams) ? task.assigned_teams : task.assigned_teams ? [task.assigned_teams] : [])
          .map((teamId: any) => ({ id: id(teamId), name: teamById.get(id(teamId)) || "Unknown team" })),
        assignment: {
          assignedByName: task.assignment?.assignedBy?.name || null,
          assignedToName: task.assignment?.assignedTo?.[0]?.name || null,
          assignedToCount: task.assignment?.assignedTo?.length || 0,
        },
        match: {
          nameMatched: Boolean(nameRegex && (nameMatches.has(id(task._id)) || nameRegex.test(task.task_name || ""))),
          staffTaskAssigned: false,
          staffActivityAssigned: Boolean(personId && personMatches.has(id(task._id))),
          assignedByMatched: false,
        },
      })),
      summary: normalizeTaskSummary(result?.summary || []),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      people: people.map((person: any) => ({
        id: id(person._id),
        name: person.name || "Unknown user",
        email: person.email || "",
        avatar_url: person.avatar_url || null,
      })),
      creationTeams: creationTeams.map((team: any) => ({
        id: id(team._id),
        name: team.team_name,
        memberCount: Number(team.members_count || 0),
        headName: team.team_head?.name || "Unassigned",
      })),
      permissions: { canCreateTasks: access.canCreateTasks },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching project tasks", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectid: string }> }) {
  try {
    const { projectid } = await params;
    if (!mongoose.isValidObjectId(projectid)) {
      return NextResponse.json({ message: "Invalid project", status: 400 }, { status: 400 });
    }
    const authorization = await authorizeProjectRequest(projectid, "view");
    if (!authorization.ok) return authorization.response;
    const { access, userId } = authorization;
    if (!access.canCreateTasks) {
      return NextResponse.json({ message: "You cannot create tasks for this project", status: 403 }, { status: 403 });
    }

    const body = await req.json();
    const taskName = String(body?.task_name || "").trim();
    const taskDescription = String(body?.task_description || "").trim();
    const priority = String(body?.priority || "").trim().toLowerCase();
    const startDate = parseRequiredDate(body?.start_date);
    const endDate = parseRequiredDate(body?.end_date);
    const teamIds = Array.from(new Set(
      (Array.isArray(body?.team_ids) ? body.team_ids : []).map(String).filter(Boolean)
    ));
    if (taskName.length < 2) {
      return NextResponse.json({ message: "Task title must contain at least 2 characters", status: 400 }, { status: 400 });
    }
    if (!TASK_PRIORITIES.has(priority)) {
      return NextResponse.json({ message: "Select a valid priority", status: 400 }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ message: "Start date and end date are required", status: 400 }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ message: "End date cannot be before start date", status: 400 }, { status: 400 });
    }
    if (!teamIds.length || teamIds.some((teamId) => !mongoose.isValidObjectId(teamId))) {
      return NextResponse.json({ message: "Select at least one valid team", status: 400 }, { status: 400 });
    }
    const teams: any[] = await ProjectTeams.find({
      _id: { $in: teamIds },
      project_id: projectid,
    }).select("_id team_head").lean();
    if (teams.length !== teamIds.length) {
      return NextResponse.json({ message: "Every selected team must belong to this project", status: 400 }, { status: 400 });
    }
    if (!access.canViewAllTeams && teams.some((team) => id(team.team_head) !== userId)) {
      return NextResponse.json({ message: "Team leads may select only teams they lead", status: 403 }, { status: 403 });
    }

    const task: any = await BusinessTasks.create({
      project_id: projectid,
      assigned_teams: teamIds,
      assigned_to: null,
      business_id: access.project.business_id,
      creator: userId,
      task_name: taskName,
      task_description: taskDescription,
      priority,
      start_date: startDate,
      end_date: endDate,
      is_project_task: true,
      status: "To Do",
      activity_count: 0,
      completed_activity: 0,
    });
    await FlowLog.create({
      project_id: projectid,
      task_id: task._id,
      user_id: userId,
      Log: `Created project task ${taskName}`,
    }).catch(() => null);

    return NextResponse.json({ message: "Task created successfully", data: { _id: id(task._id) }, status: 201 }, { status: 201 });
  } catch (error) {
    console.error("Error creating project task", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
