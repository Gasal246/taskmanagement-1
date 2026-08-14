import Business_staffs from "@/models/business_staffs.model";
import { resolveProjectTaskStaffAccess } from "@/app/api/helpers/project-task-teams";

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

  if (!task?.is_project_task || !task?.project_id) return false;
  const access = await resolveProjectTaskStaffAccess(task, userId);
  return access.canViewTask;
}
