"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ListTodo } from "lucide-react";
import { DatePicker } from "antd";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAllStaffTasks } from "@/query/business/queries";
import Cookies from "js-cookie";
import { toast } from "sonner";
import LoaderSpin from "@/components/shared/LoaderSpin";

const { RangePicker } = DatePicker;

type TaskTab = "all" | "single" | "project";

type RangeState = {
  start: string;
  end: string;
};

const statusStyles: Record<string, string> = {
  Completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  "In Progress": "border-amber-500/40 bg-amber-500/15 text-amber-200",
  "To Do": "border-rose-500/40 bg-rose-500/15 text-rose-200",
  Cancelled: "border-slate-500/40 bg-slate-500/15 text-slate-200",
};

const getProgressValue = (completed: number, total: number) => {
  if (!total || total <= 0) return 0;
  const value = Math.round((completed / total) * 100);
  return Math.min(100, Math.max(0, value));
};

const getProgressClass = (value: number) => {
  if (value < 30) return "bg-red-500";
  if (value < 50) return "bg-yellow-500";
  if (value < 70) return "bg-blue-500";
  return "bg-emerald-500";
};

const priorityStyles: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  normal: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

const getTaskSortTime = (task: any) => {
  const dateValue = task?.updatedAt ?? task?.updated_at ?? task?.createdAt ?? task?.created_at;
  const timestamp = dateValue ? new Date(dateValue).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const StaffTasks = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TaskTab>("all");
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [draftRange, setDraftRange] = useState<RangeState>({ start: "", end: "" });
  const [appliedRange, setAppliedRange] = useState<RangeState>({ start: "", end: "" });
  const [filters, setFilters] = useState<Record<string, string | undefined>>({
    taskType: "all",
  });
  const [canAdd, setCanAdd] = useState(false);

  const { data: tasks, isLoading } = useGetAllStaffTasks(filters);

  useEffect(() => {
    const roleCookies = Cookies.get("user_role");
    if (!roleCookies) {
      toast.error("Cookies not available");
      return;
    }
    try {
      const roleJson = JSON.parse(roleCookies);
      setCanAdd(Boolean(roleJson?.role_name?.endsWith("HEAD")));
    } catch (error) {
      toast.error("Invalid role data");
    }
  }, []);

  useEffect(() => {
    setFilters({
      taskType: activeTab,
      start_date: appliedRange.start || undefined,
      end_date: appliedRange.end || undefined,
    });
  }, [activeTab, appliedRange]);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    setRangeValue(dates);
    setDraftRange({
      start: dateStrings?.[0] || "",
      end: dateStrings?.[1] || "",
    });
  };

  const handleApplyFilters = () => {
    setAppliedRange(draftRange);
  };

  const handleClearFilters = () => {
    setDraftRange({ start: "", end: "" });
    setAppliedRange({ start: "", end: "" });
    setRangeValue(null);
  };

  const taskList = [...(tasks?.data ?? [])].sort(
    (a: any, b: any) => getTaskSortTime(b) - getTaskSortTime(a)
  );

  return (
    <div className="p-4 pb-20 space-y-3">
      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Staff Tasks</p>
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ListTodo size={18} /> Task Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track personal assignments and project workstreams at a glance.
            </p>
          </div>
          {canAdd && (
            <Button
              className="flex items-center gap-2 bg-cyan-600/20 text-cyan-100 border border-cyan-700/50 hover:bg-cyan-500/20"
              onClick={() => router.push("/staff/tasks/add-task")}
            >
              Add Task <CalendarPlus size={16} />
            </Button>
          )}
        </div>
        {appliedRange.start && appliedRange.end && (
          <div className="mt-3 text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1">
              From {appliedRange.start}
            </span>
            <span className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1">
              To {appliedRange.end}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Task Filters</p>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TaskTab)}>
              <TabsList className="mt-2 bg-slate-900/70">
                <TabsTrigger
                  className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100"
                  value="all"
                >
                  All Tasks
                </TabsTrigger>
                <TabsTrigger
                  className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100"
                  value="single"
                >
                  Individual Tasks
                </TabsTrigger>
                <TabsTrigger
                  className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100"
                  value="project"
                >
                  Project Tasks
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px]">
              <p className="text-[11px] text-slate-400 mb-1">Within Period</p>
              <RangePicker
                onChange={handleDateChange}
                value={rangeValue}
                className="w-full text-slate-100"
                style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}
              />
            </div>
            <Button
              size="sm"
              className="h-9 bg-slate-100/10 text-slate-100 border border-slate-700/80 hover:bg-slate-100/20"
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-slate-400 hover:text-slate-200"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ListTodo size={16} /> Tasks
          </h2>
          <p className="text-xs text-slate-400">{taskList.length} tasks</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center w-full h-[15vh]">
            <LoaderSpin size={20} title="Loading Tasks..." />
          </div>
        )}

        {!isLoading && taskList.length === 0 && (
          <p className="text-xs text-slate-500 italic">No tasks found.</p>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {taskList.map((task: any) => {
            const progress = getProgressValue(
              Number(task.completed_activity || 0),
              Number(task.activity_count || 0)
            );
            const priority = typeof task?.priority === "string" ? task.priority.toLowerCase() : "";
            const endDateLabel = task?.end_date
              ? new Date(task.end_date).toLocaleDateString()
              : null;

            return (
              <div
                key={task._id}
                className="cursor-pointer rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 to-slate-900/60 p-4 transition hover:border-cyan-700/40"
                onClick={() => router.push(`/staff/tasks/${task._id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">
                      {task.task_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {task.task_description || "No description added."}
                    </p>
                    {endDateLabel && (
                      <p className="text-[11px] text-slate-500 mt-2">Due: {endDateLabel}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border ${
                        statusStyles[task.status] ||
                        "border-slate-600/40 bg-slate-700/30 text-slate-200"
                      }`}
                    >
                      {task.status || "Unknown"}
                    </span>
                    {task.is_project_task && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 text-indigo-200">
                        Project Based
                      </span>
                    )}
                    {priority && (
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border ${
                          priorityStyles[priority] ||
                          "border-slate-600/40 bg-slate-700/30 text-slate-200"
                        }`}
                      >
                        {priority} Priority
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-md bg-slate-900/60 border border-slate-800/60 px-2 py-1">
                    Activities: {task.activity_count || 0}
                  </span>
                  <span className="rounded-md bg-slate-900/60 border border-slate-800/60 px-2 py-1">
                    Completed: {task.completed_activity || 0}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-800/80">
                    <div
                      className={`h-2 rounded-full ${getProgressClass(progress)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 w-12 text-right">
                    {progress}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffTasks;
