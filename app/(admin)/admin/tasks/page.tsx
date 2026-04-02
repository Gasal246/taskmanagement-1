"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ListTodo } from "lucide-react";
import { DatePicker } from "antd";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useGetAllTasks } from "@/query/business/queries";
import LoaderSpin from "@/components/shared/LoaderSpin";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const { RangePicker } = DatePicker;
const PAGE_SIZE = 9;

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

const TasksPage = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [activeTab, setActiveTab] = useState<TaskTab>("all");
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [draftRange, setDraftRange] = useState<RangeState>({ start: "", end: "" });
  const [appliedRange, setAppliedRange] = useState<RangeState>({ start: "", end: "" });
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!businessData?._id) return;
    setFilters({
      business_id: businessData._id,
      type: activeTab,
      startDate: appliedRange.start || undefined,
      endDate: appliedRange.end || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
  }, [businessData?._id, activeTab, appliedRange, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, appliedRange.start, appliedRange.end]);

  const { data: tasks, isLoading } = useGetAllTasks(filters);

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

  const taskList = tasks?.data ?? [];
  const pagination = tasks?.pagination ?? { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE };
  const totalPages = Math.max(1, pagination.totalPages || 1);

  const pageItems = React.useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const items: Array<number | "ellipsis"> = [];
    const visiblePages = new Set([1, totalPages, page - 1, page, page + 1]);

    for (let current = 1; current <= totalPages; current += 1) {
      if (current >= 1 && current <= totalPages && visiblePages.has(current)) {
        items.push(current);
      } else if (items[items.length - 1] !== "ellipsis") {
        items.push("ellipsis");
      }
    }

    return items;
  }, [page, totalPages]);

  return (
    <div className="p-4 pb-20 space-y-3">
      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Business Tasks</p>
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ListTodo size={18} /> Task Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track individual assignments and project workstreams across the business.
            </p>
          </div>
          <Button
            className="flex items-center gap-2 bg-cyan-600/20 text-cyan-100 border border-cyan-700/50 hover:bg-cyan-500/20"
            onClick={() => router.push("/admin/tasks/addtask")}
          >
            Add Task <CalendarPlus size={16} />
          </Button>
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
          <p className="text-xs text-slate-400">{pagination.total || 0} tasks</p>
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
            return (
              <div
                key={task._id}
                className="cursor-pointer rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 to-slate-900/60 p-4 transition hover:border-cyan-700/40"
                onClick={() => router.push(`/admin/tasks/${task._id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">
                      {task.task_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {task.task_description || "No description added."}
                    </p>
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

        {totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {pageItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {item === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
