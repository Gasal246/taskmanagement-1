import Business_staffs from "@/models/business_staffs.model";
import Project_Teams from "@/models/project_team.model";
import Task_Activities from "@/models/task_activities.model";
import Team_Members from "@/models/team_members.model";

const idString = (value: any) => value?.toString?.() || "";

export async function hasStaffTaskAccess(task: any, userId: string) {
  const businessAccess = await Business_staffs.exists({
    user_id: userId,
    business_id: task?.business_id,
    status: 1,
  });
  if (!businessAccess) return false;

  if (
    idString(task?.assigned_to) === userId ||
    idString(task?.creator) === userId
  ) {
    return true;
  }

  const hasAssignedActivity = Boolean(
    await Task_Activities.exists({
      task_id: task?._id,
      $or: [{ assigned_to: userId }, { forwarded_to: userId }],
    })
  );
  if (hasAssignedActivity) return true;

  if (!task?.is_project_task || !task?.assigned_teams) return false;
  const [teamMembership, teamHead] = await Promise.all([
    Team_Members.exists({ user_id: userId, team_id: task.assigned_teams }),
    Project_Teams.exists({ _id: task.assigned_teams, team_head: userId }),
  ]);
  return Boolean(teamMembership || teamHead);
}
