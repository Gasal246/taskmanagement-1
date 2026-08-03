"use client";

import { useRouter } from "next/navigation";
import { Clock3, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StaffTaskCard,
  StaffTaskStatusFilter,
  StaffTaskSummary,
} from "@/types/staff-tasks";

const statusStyles: Record<string, string> = {
  Completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  "In Progress": "border-amber-500/40 bg-amber-500/15 text-amber-200",
  Pending:
    "border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-rose-500/15 text-orange-100",
  "To Do": "border-rose-500/40 bg-rose-500/15 text-rose-200 text-nowrap",
  Cancelled: "border-slate-500/40 bg-slate-500/15 text-slate-200",
};

const priorityStyles: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  normal: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

const summaryOptions: Array<{
  filter: StaffTaskStatusFilter;
  key: keyof StaffTaskSummary;
  label: string;
  className: string;
  activeClassName: string;
}> = [
  {
    filter: "todo",
    key: "toDo",
    label: "To Do",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    activeClassName: "border-rose-400 bg-rose-500/25 ring-1 ring-rose-400/40",
  },
  {
    filter: "pending",
    key: "pending",
    label: "Pending",
    className:
      "border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-rose-500/10 text-orange-100 hover:from-orange-500/20 hover:to-rose-500/20",
    activeClassName:
      "border-orange-400 from-orange-500/25 to-rose-500/25 ring-1 ring-orange-400/40",
  },
  {
    filter: "in_progress",
    key: "inProgress",
    label: "In Progress",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    activeClassName: "border-amber-400 bg-amber-500/25 ring-1 ring-amber-400/40",
  },
  {
    filter: "completed",
    key: "completed",
    label: "Completed",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    activeClassName: "border-emerald-400 bg-emerald-500/25 ring-1 ring-emerald-400/40",
  },
];

const getProgressClass = (value: number) => {
  if (value < 30) return "from-rose-500 via-red-500 to-orange-400 shadow-rose-500/30";
  if (value < 50) return "from-orange-500 via-amber-500 to-yellow-300 shadow-amber-500/30";
  if (value < 70) return "from-sky-500 via-cyan-400 to-blue-400 shadow-cyan-500/30";
  return "from-cyan-400 via-teal-400 to-emerald-400 shadow-emerald-500/30";
};

export const EMPTY_TASK_SUMMARY: StaffTaskSummary = {
  toDo: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
};

export const formatPendingAge = (pendingSince: string) => {
  const startedAt = new Date(pendingSince).getTime();
  if (Number.isNaN(startedAt)) return "Unknown";

  const elapsedMs = Math.max(0, Date.now() - startedAt);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (elapsedMs < hour) return "<1 hr";
  if (elapsedMs < day) {
    const value = Math.floor(elapsedMs / hour);
    return `${value} ${value === 1 ? "hr" : "hrs"}`;
  }
  if (elapsedMs < week) {
    const value = Math.floor(elapsedMs / day);
    return `${value} ${value === 1 ? "day" : "days"}`;
  }
  if (elapsedMs < month) {
    const value = Math.floor(elapsedMs / week);
    return `${value} ${value === 1 ? "week" : "weeks"}`;
  }
  if (elapsedMs < year) {
    const value = Math.floor(elapsedMs / month);
    return `${value} ${value === 1 ? "month" : "months"}`;
  }
  const value = Math.floor(elapsedMs / year);
  return `${value} ${value === 1 ? "year" : "years"}`;
};

export function TaskStatusSummaryBadges({
  summary,
  selectedStatus,
  isLoading,
  onChange,
}: {
  summary: StaffTaskSummary;
  selectedStatus?: StaffTaskStatusFilter;
  isLoading: boolean;
  onChange: (status?: StaffTaskStatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks by status">
      {isLoading
        ? Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-lg bg-slate-800" />
          ))
        : summaryOptions.map((option) => {
            const isActive = selectedStatus === option.filter;
            return (
              <button
                key={option.filter}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(isActive ? undefined : option.filter)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${option.className} ${isActive ? option.activeClassName : ""}`}
              >
                {option.label}
                <span className="ml-1.5 rounded-md bg-slate-950/40 px-1.5 py-0.5 font-semibold">
                  {summary[option.key]}
                </span>
              </button>
            );
          })}
    </div>
  );
}

export function TaskGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading tasks">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 to-slate-900/60 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3 bg-slate-800" />
              <Skeleton className="h-3 w-full bg-slate-800" />
              <Skeleton className="h-3 w-5/6 bg-slate-800" />
              <Skeleton className="h-3 w-24 bg-slate-800" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md bg-slate-800" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-24 bg-slate-800" />
            <Skeleton className="h-7 w-24 bg-slate-800" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-44 bg-slate-800" />
            <Skeleton className="h-3 w-52 bg-slate-800" />
          </div>
          <Skeleton className="mt-4 h-2 w-full rounded-full bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function TaskOverviewCard({
  task,
  href,
  matchLabels,
}: {
  task: StaffTaskCard;
  href: string;
  matchLabels?: { name?: string; staff?: string; assignedBy?: string };
}) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const progress = Math.min(100, Math.max(0, task.progress));
  const priority = task.priority?.toLowerCase() || "";
  const endDateLabel = task.end_date ? new Date(task.end_date).toLocaleDateString() : null;

  const openTask = () => router.push(href);

  return (
    <article
      role="button"
      tabIndex={0}
      className="group cursor-pointer rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-slate-900/70 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-cyan-700/50 hover:shadow-lg hover:shadow-cyan-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
      onClick={openTask}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTask();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-100">{task.task_name}</h3>
          <p
            className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400"
            title={task.task_description || "No description added."}
          >
            {task.task_description || "No description added."}
          </p>
          {endDateLabel && <p className="mt-2 text-[11px] text-slate-500">Due: {endDateLabel}</p>}
          {task.status === "Pending" && task.pending_since && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-rose-500/15 px-2 py-1 text-[11px] font-medium text-orange-100">
              <Clock3 size={12} /> Pending since {formatPendingAge(task.pending_since)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide ${statusStyles[task.status] || "border-slate-600/40 bg-slate-700/30 text-slate-200"}`}>
            {task.status}
          </span>
          {task.is_project_task && (
            <span className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-indigo-200">
              Project Based
            </span>
          )}
          {priority && (
            <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide ${priorityStyles[priority] || "border-slate-600/40 bg-slate-700/30 text-slate-200"}`}>
              {priority} Priority
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md border border-slate-800/60 bg-slate-900/60 px-2 py-1">Activities: {task.activity_count}</span>
        <span className="rounded-md border border-slate-800/60 bg-slate-900/60 px-2 py-1">Completed: {task.completed_activity}</span>
        {(task.comment_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-800/60 bg-slate-900/60 px-2 py-1">
            <MessageCircle size={12} aria-hidden="true" /> Comments: {task.comment_count}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-400">
        <p>Assigned by: <span className="text-slate-200">{task.assignment.assignedByName || "Unknown"}</span></p>
        <p>
          Assigned to: <span className="text-slate-200">{task.assignment.assignedToName || "Unassigned"}</span>
          {task.assignment.assignedToCount > 1 && <span className="ml-1 text-cyan-300">+{task.assignment.assignedToCount - 1} more</span>}
        </p>
      </div>

      {(task.match.nameMatched || task.match.staffTaskAssigned || task.match.staffActivityAssigned || task.match.assignedByMatched) && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-cyan-100">
          {task.match.nameMatched && matchLabels?.name && <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-1">Match: &quot;{matchLabels.name}&quot; in task or activity name</span>}
          {task.match.staffTaskAssigned && matchLabels?.staff && <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-1">Match: &quot;{matchLabels.staff}&quot; in task assignee</span>}
          {task.match.staffActivityAssigned && matchLabels?.staff && <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-1">Match: &quot;{matchLabels.staff}&quot; in one activity assignee</span>}
          {task.match.assignedByMatched && matchLabels?.assignedBy && <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-1">Match: &quot;{matchLabels.assignedBy}&quot; in assigned by</span>}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <div
          className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-slate-700/60 bg-slate-950/90 shadow-inner"
          role="progressbar"
          aria-label={`${task.task_name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <motion.div
            className={`relative h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(34,211,238,0.22)] ${getProgressClass(progress)}`}
            initial={shouldReduceMotion ? false : { width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
          </motion.div>
        </div>
        <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-200">{progress}%</span>
      </div>
    </article>
  );
}
