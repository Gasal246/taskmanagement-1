import type { ClientSession } from "mongoose";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";

// Read every activity, never the caller's visibility-filtered activity list.
export async function recalculateTaskTimeline(taskId: unknown, dbSession?: ClientSession) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const taskQuery = Business_Tasks.findById(taskId).select("__v");
    if (dbSession) taskQuery.session(dbSession);
    const task: any = await taskQuery.lean();
    if (!task) return;
    const firstQuery = Task_Activities.findOne({ task_id: taskId }).sort({ createdAt: 1, _id: 1 }).select("start_date");
    const lastQuery = Task_Activities.findOne({ task_id: taskId }).sort({ createdAt: -1, _id: -1 }).select("end_date");
    if (dbSession) { firstQuery.session(dbSession); lastQuery.session(dbSession); }
    const [first, last]: any[] = dbSession
      ? [await firstQuery.lean(), await lastQuery.lean()]
      : await Promise.all([firstQuery.lean(), lastQuery.lean()]);
    const timeline = { start_date: first?.start_date ?? null, end_date: last?.end_date ?? null };
    // A concurrent recalculation must retry against fresh activities, not overwrite newer dates.
    const result = await Business_Tasks.updateOne(
      { _id: taskId, __v: task.__v ?? { $exists: false } },
      { $set: timeline, $inc: { __v: 1 } },
      ...(dbSession ? [{ session: dbSession }] : [])
    );
    if (result.matchedCount) return timeline;
  }
  throw new Error("Task timeline changed concurrently; please retry");
}
