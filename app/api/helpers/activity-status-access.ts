const id = (value: any): string => value?._id?.toString?.() || value?.toString?.() || "";

export function getActivityAssigneeIds(activity: any): string[] {
  const assignees = Array.isArray(activity?.assignees) ? activity.assignees : [];
  return Array.from(new Set(
    [...assignees, activity?.assigned_to, activity?.forwarded_to]
      .map(id)
      .filter(Boolean)
  ));
}

// Supervising a person or heading a team grants visibility, not completion rights.
export function canChangeActivityStatus(task: any, activity: any, userId: string) {
  return Boolean(userId) && [task?.creator, task?.assigned_to, ...getActivityAssigneeIds(activity)]
    .some(value => id(value) === userId);
}
