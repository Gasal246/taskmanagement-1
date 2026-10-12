import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";

type AssignmentPerson = { id: string; name: string };

export async function addTaskAssignmentSummaries(
  tasks: any[],
  viewer?: { userId: string; fullTaskIds: string[] }
) {
  if (!tasks.length) return tasks;

  const taskIds = tasks.map((task) => task._id).filter(Boolean);
  const fullTaskIds = new Set(viewer?.fullTaskIds || []);
  const limitedTaskIds = viewer
    ? taskIds.filter((taskId) => !fullTaskIds.has(taskId.toString()))
    : [];
  const visibilityScope = viewer
    ? {
        $or: [
          { task_id: { $in: taskIds.filter((taskId) => fullTaskIds.has(taskId.toString())) } },
          {
            task_id: { $in: limitedTaskIds },
            $or: [
              { assigned_to: viewer.userId },
              { forwarded_to: viewer.userId },
              { assignees: viewer.userId },
            ],
          },
        ],
      }
    : { task_id: { $in: taskIds } };
  const activities = await Task_Activities.find({
    $and: [
      visibilityScope,
      { $or: [{ assigned_to: { $ne: null } }, { forwarded_to: { $ne: null } }, { "assignees.0": { $exists: true } }] },
    ],
  })
    .select("task_id assigned_to forwarded_to assignees createdAt")
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
    if (!taskId) continue;
    const activityUserIds = [
      ...(Array.isArray(activity.assignees) ? activity.assignees : []),
      activity.assigned_to,
      activity.forwarded_to,
    ].map((userId) => userId?.toString()).filter(Boolean);
    const ids = activityAssignees.get(taskId) || [];
    for (const userId of activityUserIds) {
      if (!ids.includes(userId)) ids.push(userId);
      userIds.add(userId);
    }
    activityAssignees.set(taskId, ids);
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
