import { SCHEDULE_ACTION_LABELS, type ScheduleHistoryEntry } from "@/lib/activity-deadline";

export function buildActivityHistory(activity: any, creator: any) {
  if (!activity?._id) return [];
  const entries: any[] = (activity.reassignment_history || [])
    .filter((entry: any) => entry.action === "reassigned")
    .map((entry: any) => ({ ...entry, event_type: "reassigned", event_label: "Reassigned to", event_user: entry.recipient_id, event_order: 2 }));
  if (activity.assigned_to?._id) entries.push({
    _id: `assigned-${activity._id}`, event_type: "assigned", event_label: "Assigned to",
    event_user: activity.assigned_to, event_order: 1, createdAt: activity.createdAt,
  });
  const createdBy = activity.created_by?._id ? activity.created_by : creator;
  if (createdBy?._id) entries.push({
    _id: `created-${activity._id}`, event_type: "created", event_label: "Created by",
    event_user: createdBy, event_order: 0, createdAt: activity.createdAt,
  });
  for (const entry of (activity.schedule_history || []) as ScheduleHistoryEntry[]) {
    const actor = entry.actor_id && typeof entry.actor_id === "object" ? entry.actor_id : {};
    entries.push({
      ...entry, event_type: "schedule", event_label: SCHEDULE_ACTION_LABELS[entry.action] || "Schedule updated",
      event_user: { ...actor, name: entry.actor_name || actor.name || "Unknown user" }, event_order: 3,
    });
  }
  return entries.sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() ||
    b.event_order - a.event_order || String(b._id || "").localeCompare(String(a._id || "")));
}
