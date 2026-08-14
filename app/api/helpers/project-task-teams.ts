import AdminAssignBusiness from "@/models/admin_assign_business.model";
import BusinessTasks from "@/models/business_tasks.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import ProjectTeams from "@/models/project_team.model";
import Users from "@/models/users.model";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";

const id = (value: any) => value?._id?.toString?.() || value?.toString?.() || "";

export function normalizeProjectTaskTeamIds(value: any): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(values.map(id).filter(Boolean)));
}

export async function getProjectTaskCandidateIds(task: any): Promise<string[]> {
  const teamIds = normalizeProjectTaskTeamIds(task?.assigned_teams);
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

export async function canManageProjectTaskActivities(task: any, userId: string) {
  if (!task?.is_project_task || !task?.project_id) return false;
  if (id(task.creator) === userId) return true;
  if (
    await AdminAssignBusiness.exists({
      user_id: userId,
      business_id: task.business_id,
      status: 1,
    })
  ) {
    return true;
  }
  const access = await resolveProjectAccess(id(task.project_id), userId);
  return Boolean(access?.canManage);
}

export async function getProjectTaskById(taskId: string) {
  return BusinessTasks.findById(taskId)
    .select("project_id business_id creator is_project_task assigned_teams")
    .lean();
}
