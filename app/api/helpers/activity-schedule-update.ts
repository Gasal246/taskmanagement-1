import Task_Activities from "@/models/task_activities.model";
import { activityScheduleSchema } from "@/lib/activity-schedule";
import { expectedScheduleSchema, getScheduleChange, scheduleTimestamp } from "@/lib/activity-deadline";
import { recalculateTaskTimeline } from "@/app/api/helpers/task-timeline";

export async function updateActivitySchedule({ current, body, actor, contentUpdates = {} }: {
  current: any;
  body: unknown;
  actor: { _id: unknown; name?: string };
  contentUpdates?: Record<string, unknown>;
}): Promise<{ status: number; message: string }> {
  const parsed = activityScheduleSchema.safeParse(body);
  if (!parsed.success) return { status: 400, message: parsed.error.issues[0].message };
  const next = parsed.data;
  const now = new Date();
  const change = getScheduleChange(current, next, now);
  const expected = expectedScheduleSchema.safeParse(body);
  const suppliedExpected = body != null && typeof body === "object" &&
    ("expected_start_date" in body || "expected_end_date" in body);
  if ((change.action || suppliedExpected) && !expected.success) {
    return { status: 400, message: "The current schedule is required. Refresh the activity and try again." };
  }
  if (expected.success && (
    scheduleTimestamp(expected.data.expected_start_date) !== scheduleTimestamp(current.start_date) ||
    scheduleTimestamp(expected.data.expected_end_date) !== scheduleTimestamp(current.end_date)
  )) {
    return { status: 409, message: "This activity's schedule changed. Refresh it before saving again." };
  }
  if (change.error) return { status: 400, message: change.error };

  const fields = { ...contentUpdates };
  const update: Record<string, unknown> = { $set: fields };
  if (change.action) {
    fields.start_date = new Date(next.start_date);
    fields.end_date = new Date(next.end_date);
    update.$push = { schedule_history: {
      action: change.action,
      actor_id: actor._id,
      actor_name: actor.name || "Unknown user",
      previous_start_date: current.start_date ?? null,
      previous_end_date: current.end_date ?? null,
      new_start_date: fields.start_date,
      new_end_date: fields.end_date,
      createdAt: now,
    } };
  }
  if (!Object.keys(fields).length) return { status: 200, message: "Schedule is unchanged" };
  const saved = await Task_Activities.findOneAndUpdate({
    _id: current._id,
    start_date: current.start_date ?? null,
    end_date: current.end_date ?? null,
    is_done: current.is_done ?? null,
  }, update, { new: true, runValidators: true });
  if (!saved) return { status: 409, message: "This activity changed while saving. Refresh it and try again." };
  if (change.action) await recalculateTaskTimeline(current.task_id);
  return { status: 200, message: change.action ? "Activity schedule updated" : "Activity updated" };
}
