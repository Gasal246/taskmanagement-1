import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Project_Teams from "@/models/project_team.model";
import Task_Activities from "@/models/task_activities.model";

export type AssignmentUsage = {
  projects: Array<{ project_id: string; project_name: string; contexts: string[] }>;
  tasks: Array<{ task_id: string; task_name: string; status: string; project_name: string | null; contexts: string[] }>;
};

const PROJECT_ACTIVE_STATUSES = ["pending", "approved"];
const TASK_BLOCKED_STATUSES = ["Completed", "Cancelled"];

export async function getUserActiveProjectTaskUsage(userId: string): Promise<AssignmentUsage> {
  const teamHeadRows = await Project_Teams.find({ team_head: userId })
    .select({ _id: 1, project_id: 1, team_name: 1 })
    .lean();

  const teamMembershipRows = await Project_Team_Members.find({ user_id: userId })
    .select({ project_team_id: 1 })
    .lean();

  const memberTeamIds = teamMembershipRows
    .map((row: any) => row?.project_team_id?.toString?.())
    .filter(Boolean);

  const memberTeams = memberTeamIds.length
    ? await Project_Teams.find({ _id: { $in: memberTeamIds } })
        .select({ _id: 1, project_id: 1, team_name: 1 })
        .lean()
    : [];

  const teamIds = [
    ...teamHeadRows.map((row: any) => row?._id?.toString?.()).filter(Boolean),
    ...memberTeams.map((row: any) => row?._id?.toString?.()).filter(Boolean),
  ];

  const uniqueTeamIds = [...new Set(teamIds)];

  const relevantProjectIds = [
    ...teamHeadRows.map((row: any) => row?.project_id?.toString?.()).filter(Boolean),
    ...memberTeams.map((row: any) => row?.project_id?.toString?.()).filter(Boolean),
  ];

  const uniqueProjectIds = [...new Set(relevantProjectIds)];

  const activeProjects = uniqueProjectIds.length
    ? await Business_Project.find({
        _id: { $in: uniqueProjectIds },
        status: { $in: PROJECT_ACTIVE_STATUSES },
      })
        .select({ _id: 1, project_name: 1, status: 1 })
        .lean()
    : [];

  const activeProjectIdSet = new Set(activeProjects.map((project: any) => project?._id?.toString?.()));
  const activeProjectMap = new Map(
    activeProjects.map((project: any) => [project?._id?.toString?.(), project])
  );

  const projectUsageMap = new Map<string, { project_id: string; project_name: string; contexts: Set<string> }>();

  for (const team of teamHeadRows) {
    const projectId = team?.project_id?.toString?.();
    if (!projectId || !activeProjectIdSet.has(projectId)) continue;
    const project = activeProjectMap.get(projectId);
    const current = projectUsageMap.get(projectId) ?? {
      project_id: projectId,
      project_name: project?.project_name || "Unnamed Project",
      contexts: new Set<string>(),
    };
    current.contexts.add(`Team head (${team?.team_name || "Unnamed Team"})`);
    projectUsageMap.set(projectId, current);
  }

  for (const team of memberTeams) {
    const projectId = team?.project_id?.toString?.();
    if (!projectId || !activeProjectIdSet.has(projectId)) continue;
    const project = activeProjectMap.get(projectId);
    const current = projectUsageMap.get(projectId) ?? {
      project_id: projectId,
      project_name: project?.project_name || "Unnamed Project",
      contexts: new Set<string>(),
    };
    current.contexts.add(`Team member (${team?.team_name || "Unnamed Team"})`);
    projectUsageMap.set(projectId, current);
  }

  const [directTasks, teamTasks, assignedActivities] = await Promise.all([
    Business_Tasks.find({
      assigned_to: userId,
      status: { $nin: TASK_BLOCKED_STATUSES },
    })
      .select({ _id: 1, task_name: 1, status: 1, project_id: 1 })
      .lean(),
    uniqueTeamIds.length
      ? Business_Tasks.find({
          assigned_teams: { $in: uniqueTeamIds },
          status: { $nin: TASK_BLOCKED_STATUSES },
        })
          .select({ _id: 1, task_name: 1, status: 1, project_id: 1 })
          .lean()
      : Promise.resolve([] as any[]),
    Task_Activities.find({ assigned_to: userId })
      .select({ task_id: 1 })
      .lean(),
  ]);

  const activityTaskIds = assignedActivities
    .map((row: any) => row?.task_id?.toString?.())
    .filter(Boolean);

  const activityTasks = activityTaskIds.length
    ? await Business_Tasks.find({
        _id: { $in: [...new Set(activityTaskIds)] },
        status: { $nin: TASK_BLOCKED_STATUSES },
      })
        .select({ _id: 1, task_name: 1, status: 1, project_id: 1 })
        .lean()
    : [];

  const taskProjectIds = [
    ...directTasks.map((task: any) => task?.project_id?.toString?.()).filter(Boolean),
    ...teamTasks.map((task: any) => task?.project_id?.toString?.()).filter(Boolean),
    ...activityTasks.map((task: any) => task?.project_id?.toString?.()).filter(Boolean),
  ];

  const uniqueTaskProjectIds = [...new Set(taskProjectIds)];
  const taskProjects = uniqueTaskProjectIds.length
    ? await Business_Project.find({ _id: { $in: uniqueTaskProjectIds } })
        .select({ _id: 1, project_name: 1 })
        .lean()
    : [];

  const taskProjectMap = new Map(
    taskProjects.map((project: any) => [project?._id?.toString?.(), project?.project_name || "Unnamed Project"])
  );

  const taskUsageMap = new Map<string, {
    task_id: string;
    task_name: string;
    status: string;
    project_name: string | null;
    contexts: Set<string>;
  }>();

  const addTaskUsage = (task: any, context: string) => {
    const taskId = task?._id?.toString?.();
    if (!taskId) return;
    const projectId = task?.project_id?.toString?.();
    const current = taskUsageMap.get(taskId) ?? {
      task_id: taskId,
      task_name: task?.task_name || "Unnamed Task",
      status: task?.status || "Unknown",
      project_name: projectId ? taskProjectMap.get(projectId) || "Unnamed Project" : null,
      contexts: new Set<string>(),
    };
    current.contexts.add(context);
    taskUsageMap.set(taskId, current);
  };

  for (const task of directTasks) addTaskUsage(task, "Task assignee");
  for (const task of teamTasks) addTaskUsage(task, "Assigned team task");
  for (const task of activityTasks) addTaskUsage(task, "Assigned task activity");

  return {
    projects: Array.from(projectUsageMap.values()).map((project) => ({
      ...project,
      contexts: Array.from(project.contexts),
    })),
    tasks: Array.from(taskUsageMap.values()).map((task) => ({
      ...task,
      contexts: Array.from(task.contexts),
    })),
  };
}

export function hasUsageBlocks(usage: AssignmentUsage) {
  return usage.projects.length > 0 || usage.tasks.length > 0;
}

export function buildUsageBlockMessage(roleName: string, usage: AssignmentUsage) {
  const projectLine = usage.projects.length
    ? `Projects: ${usage.projects.map((p) => p.project_name).join(", ")}`
    : "Projects: none";
  const taskLine = usage.tasks.length
    ? `Tasks: ${usage.tasks.map((t) => t.task_name).join(", ")}`
    : "Tasks: none";

  return `Cannot remove ${roleName} yet. Remove this user from active projects/tasks first. ${projectLine}. ${taskLine}.`;
}
