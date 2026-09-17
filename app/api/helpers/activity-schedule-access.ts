import type { NextRequest } from "next/server";
import AdminAssignBusiness from "@/models/admin_assign_business.model";
import { resolveSelectedHeadContext } from "@/app/api/helpers/head-reassignment-scope";
import { hasStaffTaskAccess } from "@/app/api/helpers/staff-task-access";
import { canManageProjectTaskActivities } from "@/app/api/helpers/project-task-teams";

// Keep the existing schedule-editor rules shared by the read and both write endpoints.
export async function canEditActivitySchedule(req: NextRequest, task: any, actor: any): Promise<boolean> {
  if (!task || !actor?._id) return false;
  const actorId = String(actor._id);
  if (task.is_project_task) return canManageProjectTaskActivities(task, actorId);
  const [adminAccess, headContext] = await Promise.all([
    AdminAssignBusiness.exists({ user_id: actorId, business_id: task.business_id, status: 1 }),
    actor.status === 1 ? resolveSelectedHeadContext(req, actorId, String(task.business_id)) : null,
  ]);
  return Boolean(adminAccess || String(task.creator) === actorId ||
    (headContext && await hasStaffTaskAccess(task, actorId)));
}
