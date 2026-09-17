import mongoose from "mongoose";
import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";

const validDate = value => value instanceof Date && Number.isFinite(value.getTime()) ? value : null;

// Raw documents distinguish legacy missing fields from intentionally unscheduled (null) fields.
// Persist null for unavailable legacy dates so a rerun never invents dates from a changed parent.
export function planTaskTimelineMigration(task, activities) {
  const updates = [];
  const scheduled = activities.map(activity => {
    const fields = {};
    for (const field of ["start_date", "end_date"]) {
      if (!Object.hasOwn(activity, field)) fields[field] = validDate(task[field]);
    }
    if (Object.keys(fields).length) updates.push({ _id: activity._id, fields });
    return { ...activity, ...fields };
  }).sort((a, b) => {
    const time = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return time || String(a._id).localeCompare(String(b._id));
  });
  const timeline = {
    start_date: validDate(scheduled[0]?.start_date),
    end_date: validDate(scheduled.at(-1)?.end_date),
  };
  return { updates, timeline, missingLegacyDates: !validDate(task.start_date) || !validDate(task.end_date) };
}

export async function migrateTaskActivityTimelines(db, apply = false) {
  const tasks = db.collection("business_tasks");
  const activities = db.collection("task_activities");
  const totals = { tasks: 0, activities: 0, unscheduledTasks: 0, missingLegacyDates: 0 };
  for await (const task of tasks.find({}, { projection: { start_date: 1, end_date: 1 } })) {
    const rows = await activities.find({ task_id: task._id }, {
      projection: { start_date: 1, end_date: 1, createdAt: 1 },
    }).toArray();
    const plan = planTaskTimelineMigration(task, rows);
    totals.tasks++;
    totals.activities += plan.updates.length;
    if (!plan.timeline.start_date || !plan.timeline.end_date) totals.unscheduledTasks++;
    if (plan.missingLegacyDates && plan.updates.length) totals.missingLegacyDates++;
    if (!apply) continue;
    if (plan.updates.length) {
      await activities.bulkWrite(plan.updates.map(({ _id, fields }) => ({
        updateOne: { filter: { _id }, update: { $set: fields } },
      })));
    }
    // Finish backfilling every activity before replacing the parent dates. Raw writes preserve timestamps.
    await tasks.updateOne({ _id: task._id }, { $set: plan.timeline });
  }
  return totals;
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const totals = await migrateTaskActivityTimelines(mongoose.connection, apply);
    console.log(`${apply ? "Applied" : "Dry run"}: ${JSON.stringify(totals)}`);
    if (!apply) console.log("Pause task/activity writes, then rerun with --apply during rollout.");
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
