import AdminAssignBusiness from "@/models/admin_assign_business.model";
import BusinessStaffs from "@/models/business_staffs.model";
import BusinessTasks from "@/models/business_tasks.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import ProjectTeams from "@/models/project_team.model";
import TaskActivities from "@/models/task_activities.model";
import UserRoles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";
import { HEAD_ROLES } from "@/lib/constants";
import "@/models/roles.model";

const id = (value: any) => value?._id?.toString?.() || value?.toString?.() || "";

export function normalizeProjectTaskTeamIds(value: any): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(values.map(id).filter(Boolean)));
}

async function getCandidateIdsForTeams(teamIds: string[]): Promise<string[]> {
  if (!teamIds.length) return [];

  const [teams, memberships] = await Promise.all([
    ProjectTeams.find({ _id: { $in: teamIds } }).select("team_head").lean(),
    ProjectTeamMembers.find({ project_team_id: { $in: teamIds } })
      .select("user_id")
      .lean(),
  ]);
  const candidateIds = Array.from(
    new Set([
      ...teams.map((team: any) => id(team.team_head)),
      ...memberships.map((membership: any) => id(membership.user_id)),
    ].filter(Boolean))
  );
  const activeUsers = await Users.find({ _id: { $in: candidateIds }, status: 1 })
    .select("_id")
    .lean();
  return activeUsers.map((user: any) => id(user._id));
}

export async function getProjectTaskCandidateIds(task: any): Promise<string[]> {
  return getCandidateIdsForTeams(normalizeProjectTaskTeamIds(task?.assigned_teams));
}

export type ProjectTaskStaffAccess = {
  isAdmin: boolean;
  isCreator: boolean;
  isProjectOperations: boolean;
  isAssignedTeamHead: boolean;
  isActivityParticipant: boolean;
  hasActiveHeadRole: boolean;
  canViewTask: boolean;
  canViewAllActivities: boolean;
  canManageActivities: boolean;
  canAssignActivities: boolean;
};

const NO_PROJECT_TASK_ACCESS: ProjectTaskStaffAccess = {
  isAdmin: false,
  isCreator: false,
  isProjectOperations: false,
  isAssignedTeamHead: false,
  isActivityParticipant: false,
  hasActiveHeadRole: false,
  canViewTask: false,
  canViewAllActivities: false,
  canManageActivities: false,
  canAssignActivities: false,
};

export async function resolveProjectTaskStaffAccess(
  task: any,
  userId: string
): Promise<ProjectTaskStaffAccess> {
  if (!task?.is_project_task || !task?.project_id || !task?.business_id || !userId) {
    return NO_PROJECT_TASK_ACCESS;
  }

  const teamIds = normalizeProjectTaskTeamIds(task.assigned_teams);
  const [adminAssignment, staffAssignment, projectAccess, assignedTeamHead, activityParticipant] =
    await Promise.all([
      AdminAssignBusiness.exists({
        user_id: userId,
        business_id: task.business_id,
        status: 1,
      }),
      BusinessStaffs.exists({
        user_id: userId,
        business_id: task.business_id,
        status: 1,
      }),
      resolveProjectAccess(id(task.project_id), userId),
      teamIds.length
        ? ProjectTeams.exists({ _id: { $in: teamIds }, team_head: userId })
        : Promise.resolve(null),
      TaskActivities.exists({
        task_id: task._id,
        $or: [{ assigned_to: userId }, { forwarded_to: userId }],
      }),
    ]);

  const isAdmin = Boolean(adminAssignment);
  const isActiveStaff = Boolean(staffAssignment);
  const isCreator = isActiveStaff && id(task.creator) === userId;
  const isProjectOperations = isActiveStaff && Boolean(projectAccess?.isProjectOperations);
  const isAssignedTeamHead = isActiveStaff && Boolean(assignedTeamHead);
  const isActivityParticipant = isActiveStaff && Boolean(activityParticipant);
  const canViewTask =
    isAdmin ||
    isCreator ||
    isProjectOperations ||
    isAssignedTeamHead ||
    isActivityParticipant;

  const activeRoles: any[] = isActiveStaff && canViewTask
    ? await UserRoles.find({
        user_id: userId,
        business_id: task.business_id,
        status: 1,
      })
        .populate({ path: "role_id", select: "role_name" })
        .lean()
    : [];
  const hasActiveHeadRole = activeRoles.some((role: any) =>
    HEAD_ROLES.includes(String(role?.role_id?.role_name || ""))
  );
  const canViewAllActivities =
    isAdmin || isCreator || isProjectOperations || isAssignedTeamHead;
  const canManageActivities =
    canViewTask && (isAdmin || isCreator || Boolean(projectAccess?.canManage));
  const canAssignActivities =
    canManageActivities ||
    isProjectOperations ||
    isAssignedTeamHead ||
    hasActiveHeadRole;

  return {
    isAdmin,
    isCreator,
    isProjectOperations,
    isAssignedTeamHead,
    isActivityParticipant,
    hasActiveHeadRole,
    canViewTask,
    canViewAllActivities,
    canManageActivities,
    canAssignActivities,
  };
}

export async function canManageProjectTaskActivities(task: any, userId: string) {
  return (await resolveProjectTaskStaffAccess(task, userId)).canManageActivities;
}

export async function canAssignProjectTaskActivities(task: any, userId: string) {
  return (await resolveProjectTaskStaffAccess(task, userId)).canAssignActivities;
}

export async function getProjectTaskAssignmentCandidateIds(
  task: any,
  userId: string
): Promise<string[]> {
  const access = await resolveProjectTaskStaffAccess(task, userId);
  if (!access.canAssignActivities) return [];

  const taskTeamIds = normalizeProjectTaskTeamIds(task?.assigned_teams);
  if (!taskTeamIds.length) return [];
  if (access.isAdmin || access.isProjectOperations) {
    return getCandidateIdsForTeams(taskTeamIds);
  }

  if (access.isAssignedTeamHead) {
    const headedTeams = await ProjectTeams.find({
      _id: { $in: taskTeamIds },
      team_head: userId,
    }).select("_id").lean();
    return getCandidateIdsForTeams(headedTeams.map((team: any) => id(team._id)));
  }

  if (access.canManageActivities) {
    return getCandidateIdsForTeams(taskTeamIds);
  }

  const [headedTeams, memberships] = await Promise.all([
    ProjectTeams.find({ _id: { $in: taskTeamIds }, team_head: userId })
      .select("_id")
      .lean(),
    ProjectTeamMembers.find({
      project_team_id: { $in: taskTeamIds },
      user_id: userId,
    }).select("project_team_id").lean(),
  ]);
  const visibleTeamIds = Array.from(new Set([
    ...headedTeams.map((team: any) => id(team._id)),
    ...memberships.map((membership: any) => id(membership.project_team_id)),
  ].filter(Boolean)));
  return getCandidateIdsForTeams(visibleTeamIds);
}

export async function getProjectTaskById(taskId: string) {
  return BusinessTasks.findById(taskId)
    .select("project_id business_id creator is_project_task assigned_teams")
    .lean();
}
