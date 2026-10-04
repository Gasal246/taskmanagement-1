import mongoose from "mongoose";
import Activities from "@/models/task_activities.model";

// Resolve activity matches only inside the already-authorized task set. Each
// lookup returns an existence marker rather than every matching activity ID.
export function taskActivityFilterStages(
  name: RegExp | null,
  staffId: mongoose.Types.ObjectId | null,
  visibleActivityScope?: Record<string, any>,
): any[] {
  const stages: any[] = [];
  const exists = (alias: string, match: Record<string, any>) => ({
    $lookup: {
      from: Activities.collection.name, localField: "_id", foreignField: "task_id",
      pipeline: [
        { $match: visibleActivityScope ? { $and: [match, visibleActivityScope] } : match },
        { $limit: 1 }, { $project: { _id: 1 } },
      ], as: alias,
    },
  });
  if (name) stages.push(
    exists("__matchingNameActivity", { activity: name }),
    { $match: { $or: [{ task_name: name }, { "__matchingNameActivity.0": { $exists: true } }] } },
    { $set: { __nameActivityMatched: { $gt: [{ $size: "$__matchingNameActivity" }, 0] } } },
  );
  if (staffId) stages.push(
    exists("__matchingStaffActivity", { $or: [{ assigned_to: staffId }, { forwarded_to: staffId }] }),
    { $match: { $or: [{ assigned_to: staffId }, { "__matchingStaffActivity.0": { $exists: true } }] } },
    { $set: { __staffActivityMatched: { $gt: [{ $size: "$__matchingStaffActivity" }, 0] } } },
  );
  if (name || staffId) stages.push({ $unset: ["__matchingNameActivity", "__matchingStaffActivity"] });
  return stages;
}
