import AdminAssignBusiness from "@/models/admin_assign_business.model";
import Business_Tasks from "@/models/business_tasks.model";
import Business_Project from "@/models/business_project.model";
import Project_Teams from "@/models/project_team.model";
import Notifications from "@/models/notifications.model";
import FcmTokens from "@/models/fcm_tokens.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
import type { NextRequest } from "next/server";

type ActivityNotificationAction = "added" | "removed" | "completed";

const truncateText = (value: string, maxLength: number) => {
  const text = value?.trim() || "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const resolveRoleDomain = (req: NextRequest) => {
  const roleCookie = req.cookies.get("user_role")?.value || "";
  const domainCookie = req.cookies.get("user_domain")?.value || "";
  let roleLabel = "";
  let domainLabel = "";
  try {
    const parsedRole = roleCookie ? JSON.parse(roleCookie) : null;
    roleLabel = parsedRole?.role_name || parsedRole?.role || "";
  } catch (error) {
    roleLabel = "";
  }
  try {
    const parsedDomain = domainCookie ? JSON.parse(domainCookie) : null;
    domainLabel =
      parsedDomain?.region_name ||
      parsedDomain?.area_name ||
      parsedDomain?.location_name ||
      parsedDomain?.dept_name ||
      parsedDomain?.name ||
      "";
  } catch (error) {
    domainLabel = "";
  }
  const formattedRole = roleLabel ? roleLabel.split("_").join(" ") : "";
  const byLineParts = [formattedRole || roleLabel, domainLabel].filter(Boolean);
  return {
    role: formattedRole || roleLabel,
    domain: domainLabel,
    byLine: byLineParts.join(" + "),
  };
};

const resolveNotificationTitle = (action: ActivityNotificationAction) => {
  if (action === "added") return "New Activity Added";
  if (action === "removed") return "Activity Removed";
  return "Activity Completed";
};

export async function notifyTaskActivityChange({
  req,
  taskId,
  activityId,
  activityTitle,
  activityDescription,
  activityAssignedTo,
  action,
  actorId,
  actorName,
}: {
  req: NextRequest;
  taskId: string;
  activityId?: string | null;
  activityTitle?: string | null;
  activityDescription?: string | null;
  activityAssignedTo?: string | null;
  action: ActivityNotificationAction;
  actorId: string;
  actorName: string;
}) {
  const task: {
    task_name?: string;
    is_project_task?: boolean;
    assigned_to?: string | null;
    assigned_teams?: string[] | string | null;
    creator?: string | null;
    project_id?: string | null;
    business_id?: string | null;
  } | null = await Business_Tasks.findById(taskId)
    .select("task_name is_project_task assigned_to assigned_teams creator project_id business_id")
    .lean<{
      task_name?: string;
      is_project_task?: boolean;
      assigned_to?: string | null;
      assigned_teams?: string[] | string | null;
      creator?: string | null;
      project_id?: string | null;
      business_id?: string | null;
    }>();
  if (!task) return;

  const recipients = new Set<string>();
  if (task.business_id) {
    const admins = await AdminAssignBusiness.find({
      business_id: task.business_id,
      status: 1,
    }).select("user_id").lean();
    admins.forEach((admin: any) => {
      if (admin?.user_id) recipients.add(String(admin.user_id));
    });
  }
  if (task.creator) recipients.add(String(task.creator));
  if (task.assigned_to) recipients.add(String(task.assigned_to));
  if (activityAssignedTo) recipients.add(String(activityAssignedTo));

  if (task.is_project_task && task.assigned_teams) {
    const teamIds = (Array.isArray(task.assigned_teams) ? task.assigned_teams : [task.assigned_teams])
      .map(String)
      .filter(Boolean);
    const teams: Array<{ team_head?: string | null }> = await Project_Teams.find({ _id: { $in: teamIds } })
      .select("team_head")
      .lean<Array<{ team_head?: string | null }>>();
    teams.forEach((team) => {
      if (team?.team_head) recipients.add(String(team.team_head));
    });
    if (task.project_id) {
      const project: any = await Business_Project.findById(task.project_id)
        .select("project_head project_heads project_supervisors account_managers site_operational_heads")
        .lean();
      [
        project?.project_head,
        ...(Array.isArray(project?.project_heads) ? project.project_heads : []),
        ...(Array.isArray(project?.project_supervisors) ? project.project_supervisors : []),
        ...(Array.isArray(project?.account_managers) ? project.account_managers : []),
        ...(Array.isArray(project?.site_operational_heads) ? project.site_operational_heads : []),
      ].forEach((userId) => {
        if (userId) recipients.add(String(userId));
      });
    }
  }

  const recipientIds = Array.from(recipients).filter(Boolean);
  if (recipientIds.length === 0) return;

  const { role, domain, byLine } = resolveRoleDomain(req);
  const taskName = truncateText(task.task_name || "Task", 64);
  const activityName = truncateText(activityTitle || "", 64);
  const activityDesc = truncateText(activityDescription || "", 140);
  const notificationTitle = resolveNotificationTitle(action);
  const notificationBody = [activityName, activityDesc]
    .filter(Boolean)
    .join(" — ");

  const taskType = task.is_project_task ? "Project Task" : "Individual Task";

  const meta = {
    taskId,
    taskName,
    taskType,
    activityId: activityId || "",
    activityTitle: activityName,
    activityDescription: activityDesc,
    action,
    actorName,
    actorRole: role,
    actorDomain: domain,
    byLine,
  };

  const data: Record<string, string> = {
    type: "task-activity",
    taskId,
    taskName,
    taskType,
    activityId: activityId || "",
    activityTitle: activityName,
    action,
    actorName,
    byLine,
  };

  await Notifications.insertMany(
    recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actorId,
      kind: "task-activity",
      title: notificationTitle,
      body: notificationBody,
      data,
      meta,
      read_at: null,
    }))
  );

  const tokenDocs = await FcmTokens.find(
    { user_id: { $in: recipientIds } },
    { token: 1 }
  ).lean();
  const tokens = tokenDocs.map((doc: any) => doc.token).filter(Boolean);
  if (tokens.length === 0) return;

  try {
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notificationTitle,
        body: notificationBody || taskName,
      },
      data,
    });
    const invalidTokens = response.responses
      .map((res, index) => {
        const code = res.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          return tokens[index];
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (invalidTokens.length > 0) {
      await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
    }
  } catch (error) {
    console.log("Failed to send task activity notification", error);
  }
}
