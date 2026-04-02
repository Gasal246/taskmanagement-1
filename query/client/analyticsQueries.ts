import { useQuery } from "@tanstack/react-query";

const defaultProjectStats = [
  { projectType: "ongoing", count: 0, fill: "var(--color-ongoing)" },
  { projectType: "owned", count: 0, fill: "var(--color-owned)" },
  { projectType: "completed", count: 0, fill: "var(--color-completed)" },
  { projectType: "new", count: 0, fill: "var(--color-new)" },
];

const defaultTaskStats = [
  { taskType: "ongoing", count: 0, fill: "var(--color-ongoing)" },
  { taskType: "pending", count: 0, fill: "var(--color-pending)" },
  { taskType: "completed", count: 0, fill: "var(--color-completed)" },
  { taskType: "notAccepted", count: 0, fill: "var(--color-notAccepted)" },
];

const defaultCompletedPending = [
  { month: "Jan", completed: 0, pending: 0 },
  { month: "Feb", completed: 0, pending: 0 },
  { month: "Mar", completed: 0, pending: 0 },
  { month: "Apr", completed: 0, pending: 0 },
  { month: "May", completed: 0, pending: 0 },
  { month: "Jun", completed: 0, pending: 0 },
  { month: "Jul", completed: 0, pending: 0 },
  { month: "Aug", completed: 0, pending: 0 },
  { month: "Sep", completed: 0, pending: 0 },
  { month: "Oct", completed: 0, pending: 0 },
  { month: "Nov", completed: 0, pending: 0 },
  { month: "Dec", completed: 0, pending: 0 },
];

export const useGetProjectStatistics = (_userId?: string) => {
  return useQuery({
    queryKey: ["legacy-project-statistics", _userId],
    queryFn: async () => defaultProjectStats,
  });
};

export const useGetProjectCompletedPendingAnalytics = (_userId?: string) => {
  return useQuery({
    queryKey: ["legacy-project-completed-pending", _userId],
    queryFn: async () => defaultCompletedPending,
  });
};

export const useGetTaskAnalyticsPi = (_userId?: string) => {
  return useQuery({
    queryKey: ["legacy-task-analytics", _userId],
    queryFn: async () => defaultTaskStats,
  });
};

export const useGetAllProjectAnalytics = (_userId?: string) => {
  return useQuery({
    queryKey: ["legacy-all-project-analytics", _userId],
    queryFn: async () => ({
      projects: defaultProjectStats,
      completedPending: defaultCompletedPending,
      tasks: defaultTaskStats,
    }),
  });
};
