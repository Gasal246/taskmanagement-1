import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";

// Read every activity, never the caller's visibility-filtered activity list.
export async function recalculateTaskTimeline(taskId: unknown) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const task: any = await Business_Tasks.findById(taskId).select("__v").lean();
    if (!task) return;
    const [first, last] = await Promise.all([
      Task_Activities.findOne({ task_id: taskId }).sort({ createdAt: 1, _id: 1 }).select("start_date").lean(),
      Task_Activities.findOne({ task_id: taskId }).sort({ createdAt: -1, _id: -1 }).select("end_date").lean(),
    ]) as any[];
    const timeline = { start_date: first?.start_date ?? null, end_date: last?.end_date ?? null };
    // A concurrent recalculation must retry against fresh activities, not overwrite newer dates.
    const result = await Business_Tasks.updateOne(
      { _id: taskId, __v: task.__v ?? { $exists: false } },
      { $set: timeline, $inc: { __v: 1 } }
    );
    if (result.matchedCount) return timeline;
  }
  throw new Error("Task timeline changed concurrently; please retry");
}
