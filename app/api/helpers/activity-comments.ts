import AdminAssignBusiness from "@/models/admin_assign_business.model";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import ActivityComments from "@/models/activity_comments.model";
import BusinessStaffs from "@/models/business_staffs.model";
import BusinessProjects from "@/models/business_project.model";
import BusinessTasks from "@/models/business_tasks.model";
import ProjectTeams from "@/models/project_team.model";
import TaskActivities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { normalizeProjectTaskTeamIds, resolveProjectTaskStaffAccess } from "@/app/api/helpers/project-task-teams";
import mongoose from "mongoose";

export async function authorizeActivityViewer(userId: string, activityId: string) {
  const activity: any = await TaskActivities.findById(activityId).lean();
  if (!activity) return { status: 404 as const, activity: null, task: null, isAdmin: false };

  const task: any = await BusinessTasks.findById(activity.task_id).lean();
  if (!task) return { status: 404 as const, activity: null, task: null, isAdmin: false };

  const [adminAssignment, staffAssignment] = await Promise.all([
    AdminAssignBusiness.exists({ user_id: userId, business_id: task.business_id, status: 1 }),
    BusinessStaffs.exists({ user_id: userId, business_id: task.business_id, status: 1 }),
  ]);
  const activeUser = await Users.exists({ _id: userId, status: 1 });
  const isAdmin = Boolean(activeUser && adminAssignment);
  const isAssignedStaff =
    Boolean(activeUser && staffAssignment) && [activity.assigned_to, activity.forwarded_to]
      .some((assignedUserId) => String(assignedUserId || "") === String(userId));
  const projectTaskAccess = task.is_project_task
    ? await resolveProjectTaskStaffAccess(task, userId)
    : null;
  const canViewProjectActivity = Boolean(projectTaskAccess?.canViewAllActivities);

  if (!isAdmin && !isAssignedStaff && !canViewProjectActivity) {
    return { status: 403 as const, activity: null, task: null, isAdmin: false };
  }
  return { status: 200 as const, activity, task, isAdmin };
}

export async function getActivityViewerIds(task: any, activity: any) {
  const admins = await AdminAssignBusiness.find({
    business_id: task.business_id,
    status: 1,
  }).select("user_id").lean();
  const adminIds = new Set(admins.map((row: any) => String(row.user_id || "")).filter(Boolean));
  const staffCandidateIds = new Set<string>();

  const activityStaffIds = [activity.assigned_to, activity.forwarded_to]
    .map((userId) => String(userId || ""))
    .filter(Boolean);
  if (activityStaffIds.length) {
    const activeStaff = await BusinessStaffs.find({
      business_id: task.business_id,
      user_id: { $in: activityStaffIds },
      status: 1,
    }).select("user_id").lean();
    activeStaff.forEach((staff: any) => staffCandidateIds.add(String(staff.user_id)));
  }

  if (task.is_project_task && task.project_id) {
    const teamIds = normalizeProjectTaskTeamIds(task.assigned_teams);
    const [projectResult, teams] = await Promise.all([
      BusinessProjects.findById(task.project_id)
        .select("project_head project_heads project_supervisors account_managers site_operational_heads")
        .lean(),
      teamIds.length
        ? ProjectTeams.find({ _id: { $in: teamIds } }).select("team_head").lean()
        : Promise.resolve([]),
    ]);
    const project: any = projectResult;
    const fullViewerIds = [
      task.creator,
      project?.project_head,
      ...(Array.isArray(project?.project_heads) ? project.project_heads : []),
      ...(Array.isArray(project?.project_supervisors) ? project.project_supervisors : []),
      ...(Array.isArray(project?.account_managers) ? project.account_managers : []),
      ...(Array.isArray(project?.site_operational_heads) ? project.site_operational_heads : []),
      ...teams.map((team: any) => team.team_head),
    ].map((userId) => String(userId || "")).filter(Boolean);
    if (fullViewerIds.length) {
      const activeProjectStaff = await BusinessStaffs.find({
        business_id: task.business_id,
        user_id: { $in: fullViewerIds },
        status: 1,
      }).select("user_id").lean();
      activeProjectStaff.forEach((staff: any) => staffCandidateIds.add(String(staff.user_id)));
    }
  }

  const ids = new Set([...adminIds, ...staffCandidateIds]);
  const activeUsers = await Users.find({ _id: { $in: Array.from(ids) }, status: 1 })
    .select("_id")
    .lean();
  return activeUsers.map((user: any) => String(user._id));
}

export async function addUnreadCommentCounts(activities: any[], userId: string) {
  if (!activities.length) return activities;
  const activityIds = activities.map((activity: any) => activity._id);
  const viewerId = new mongoose.Types.ObjectId(userId);
  const [unread, totals] = await Promise.all([ActivityComments.aggregate([
    {
      $match: {
        activity_id: { $in: activityIds },
        author_id: { $ne: viewerId },
        deleted_at: null,
      },
    },
    {
      $lookup: {
        from: ActivityCommentReads.collection.name,
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$comment_id", "$$commentId"] },
                  { $eq: ["$user_id", viewerId] },
                ],
              },
            },
          },
        ],
        as: "reads",
      },
    },
    { $match: { reads: { $size: 0 } } },
    { $group: { _id: "$activity_id", count: { $sum: 1 } } },
  ]), ActivityComments.aggregate([
    { $match: { activity_id: { $in: activityIds }, deleted_at: null } },
    { $group: { _id: "$activity_id", count: { $sum: 1 } } },
  ])]);
  const countMap = new Map(unread.map((row: any) => [String(row._id), row.count]));
  const totalMap = new Map(totals.map((row: any) => [String(row._id), row.count]));
  return activities.map((activity: any) => ({
    ...(typeof activity.toObject === "function" ? activity.toObject() : activity),
    unread_comment_count: countMap.get(String(activity._id)) || 0,
    comment_count: totalMap.get(String(activity._id)) || 0,
  }));
}
