const id = (value: any): string => value?._id?.toString?.() || value?.toString?.() || "";

// Supervising a person or heading a team grants visibility, not completion rights.
export function canChangeActivityStatus(task: any, activity: any, userId: string) {
  return Boolean(userId) && [task?.creator, task?.assigned_to, activity?.assigned_to, activity?.forwarded_to]
    .some(value => id(value) === userId);
}
