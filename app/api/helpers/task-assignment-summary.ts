import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";

type AssignmentPerson = { id: string; name: string };

export async function addTaskAssignmentSummaries(tasks: any[]) {
  if (!tasks.length) return tasks;

  const taskIds = tasks.map((task) => task._id).filter(Boolean);
  const activities = await Task_Activities.find({
    task_id: { $in: taskIds },
    assigned_to: { $ne: null },
  })
    .select("task_id assigned_to createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const activityAssignees = new Map<string, string[]>();
  const userIds = new Set<string>();
  for (const task of tasks) {
    if (task.creator) userIds.add(task.creator.toString());
    if (task.assigned_to) userIds.add(task.assigned_to.toString());
  }
  for (const activity of activities) {
    const taskId = activity.task_id?.toString();
    const userId = activity.assigned_to?.toString();
    if (!taskId || !userId) continue;
    const ids = activityAssignees.get(taskId) || [];
    if (!ids.includes(userId)) ids.push(userId);
    activityAssignees.set(taskId, ids);
    userIds.add(userId);
  }

  const users = await Users.find({ _id: { $in: Array.from(userIds) } })
    .select("name")
    .lean();
  const people = new Map<string, AssignmentPerson>(
    users.map((user: any) => [
      user._id.toString(),
      { id: user._id.toString(), name: user.name || "Unknown user" },
    ])
  );

  return tasks.map((task) => {
    const primaryId = task.assigned_to?.toString();
    const assigneeIds = [
      ...(primaryId ? [primaryId] : []),
      ...(activityAssignees.get(task._id.toString()) || []),
    ].filter((id, index, ids) => ids.indexOf(id) === index);

    return {
      ...task,
      assignment: {
        assignedBy: task.creator ? people.get(task.creator.toString()) || null : null,
        assignedTo: assigneeIds.map((id) => people.get(id)).filter(Boolean),
      },
    };
  });
}
