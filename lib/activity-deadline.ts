import { z } from "zod";

export const SCHEDULE_ACTIONS = ["deadline_extended", "deadline_shortened", "schedule_updated", "schedule_set"] as const;
export type ScheduleAction = typeof SCHEDULE_ACTIONS[number];
export type SchedulePeriod = { start_date: string | Date | null; end_date: string | Date | null };
export type ScheduleHistoryEntry = {
  _id?: string;
  action: ScheduleAction;
  actor_id: string | { _id?: string; name?: string; avatar_url?: string } | null;
  actor_name: string;
  previous_start_date: string | Date | null;
  previous_end_date: string | Date | null;
  new_start_date: string | Date;
  new_end_date: string | Date;
  createdAt: string | Date;
};

export const expectedScheduleSchema = z.object({
  expected_start_date: z.string().datetime({ offset: true }).nullable(),
  expected_end_date: z.string().datetime({ offset: true }).nullable(),
});

export const deadlineChangeSchema = expectedScheduleSchema.extend({
  end_date: z.string().datetime({ offset: true }),
});

export const scheduleTimestamp = (value: string | Date | null | undefined) =>
  value == null ? null : new Date(value).getTime();

export function getScheduleChange(
  current: SchedulePeriod & { is_done?: boolean },
  next: SchedulePeriod,
  now: Date = new Date()
): { action: ScheduleAction | null; error?: string } {
  const oldStart = scheduleTimestamp(current.start_date);
  const oldEnd = scheduleTimestamp(current.end_date);
  const start = scheduleTimestamp(next.start_date);
  const end = scheduleTimestamp(next.end_date);
  if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end)) {
    return { action: null, error: "Enter valid start and end times" };
  }
  if (end < start) return { action: null, error: "End must be at or after start" };
  if (oldStart === start && oldEnd === end) return { action: null };
  if (current.is_done) return { action: null, error: "Reopen this activity before changing its schedule" };
  if (oldEnd !== end && end <= now.getTime()) {
    return { action: null, error: "The new deadline must be in the future" };
  }
  if (oldStart == null || oldEnd == null) return { action: "schedule_set" };
  if (end > oldEnd) return { action: "deadline_extended" };
  if (end < oldEnd) {
    if (oldEnd <= now.getTime()) return { action: null, error: "An overdue deadline cannot be shortened" };
    return { action: "deadline_shortened" };
  }
  return { action: "schedule_updated" };
}

export const SCHEDULE_ACTION_LABELS: Record<ScheduleAction, string> = {
  deadline_extended: "Deadline extended",
  deadline_shortened: "Deadline shortened",
  schedule_updated: "Schedule updated",
  schedule_set: "Schedule set",
};
