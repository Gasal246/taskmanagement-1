import type { StaffTaskSummary, StaffTaskStatusFilter } from "@/types/staff-tasks";

export const TASK_STATUS_FILTERS: Record<StaffTaskStatusFilter, string> = {
  todo: "To Do",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export const isTaskStatusFilter = (value: string): value is StaffTaskStatusFilter =>
  Object.hasOwn(TASK_STATUS_FILTERS, value);

export const getTaskStatusAggregationStages = (todayStartUtc: Date) => [
  {
    $set: {
      __activityCount: { $max: [{ $ifNull: ["$activity_count", 0] }, 0] },
      __completedCount: { $max: [{ $ifNull: ["$completed_activity", 0] }, 0] },
    },
  },
  {
    $set: {
      __progress: {
        $cond: [
          { $gt: ["$__activityCount", 0] },
          {
            $min: [
              100,
              {
                $max: [
                  0,
                  {
                    $round: [
                      {
                        $multiply: [
                          { $divide: ["$__completedCount", "$__activityCount"] },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
          0,
        ],
      },
      __displayStatus: {
        $switch: {
          branches: [
            { case: { $eq: ["$status", "Cancelled"] }, then: "Cancelled" },
            {
              case: {
                $and: [
                  { $gt: ["$__activityCount", 0] },
                  { $gte: ["$__completedCount", "$__activityCount"] },
                ],
              },
              then: "Completed",
            },
            {
              case: {
                $and: [
                  { $ne: [{ $ifNull: ["$end_date", null] }, null] },
                  { $lt: ["$end_date", todayStartUtc] },
                ],
              },
              then: "Pending",
            },
            { case: { $gt: ["$__completedCount", 0] }, then: "In Progress" },
          ],
          default: "To Do",
        },
      },
    },
  },
];

export const getTaskStatusMatchStages = (status?: StaffTaskStatusFilter) =>
  status ? [{ $match: { __displayStatus: TASK_STATUS_FILTERS[status] } }] : [];

export const normalizeTaskSummary = (
  values: Array<{ _id: string; count: number }> = []
): StaffTaskSummary => {
  const summary: StaffTaskSummary = { toDo: 0, pending: 0, inProgress: 0, completed: 0 };
  for (const value of values) {
    if (value._id === "To Do") summary.toDo = value.count;
    if (value._id === "Pending") summary.pending = value.count;
    if (value._id === "In Progress") summary.inProgress = value.count;
    if (value._id === "Completed") summary.completed = value.count;
  }
  return summary;
};
