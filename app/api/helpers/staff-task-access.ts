import Business_staffs from "@/models/business_staffs.model";
import Task_Activities from "@/models/task_activities.model";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";

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

  if (!task?.is_project_task || !task?.project_id) return false;
  const access = await resolveProjectAccess(idString(task.project_id), userId);
  return Boolean(access?.canManage);
}
