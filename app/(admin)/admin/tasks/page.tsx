"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ListTodo, RefreshCw, X } from "lucide-react";
import { DatePicker } from "antd";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_TASK_SUMMARY,
  TaskGridSkeleton,
  TaskOverviewCard,
  TaskStatusSummaryBadges,
} from "@/components/tasks/TaskOverview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  useGetAdminTaskFilterOptions,
  useGetAdminTaskOverview,
} from "@/query/business/queries";
import type {
  AdminTaskCard,
  AdminTaskQueryParams,
  AdminTaskTab,
} from "@/types/admin-tasks";
import type { StaffTaskStatusFilter } from "@/types/staff-tasks";

const { RangePicker } = DatePicker;
const PAGE_SIZE = 9;

type RangeState = { start: string; end: string };

const TasksPage = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const businessId = businessData?._id || "";
  const [activeTab, setActiveTab] = useState<AdminTaskTab>("all");
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [draftRange, setDraftRange] = useState<RangeState>({ start: "", end: "" });
  const [appliedRange, setAppliedRange] = useState<RangeState>({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [nameSearch, setNameSearch] = useState("");
  const [appliedNameSearch, setAppliedNameSearch] = useState("");
  const [showNameFilter, setShowNameFilter] = useState(false);
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [showAssignedByFilter, setShowAssignedByFilter] = useState(false);
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignedBySearch, setAssignedBySearch] = useState("");
  const [selectedAssignedById, setSelectedAssignedById] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StaffTaskStatusFilter>();

  const staffOptionQuery = useGetAdminTaskFilterOptions(
    businessId,
    "staff",
    showStaffFilter
  );
  const headOptionQuery = useGetAdminTaskFilterOptions(
    businessId,
    "heads",
    showAssignedByFilter
  );
  const staffOptions = useMemo(
    () =>
      (staffOptionQuery.data?.data || []).map((staff) => ({
        id: staff.id,
        label: [staff.name, staff.email].filter(Boolean).join(" — "),
      })),
    [staffOptionQuery.data]
  );
  const headOptions = useMemo(
    () =>
      (headOptionQuery.data?.data || []).map((head) => ({
        id: head.id,
        label: [head.name, head.email].filter(Boolean).join(" — "),
      })),
    [headOptionQuery.data]
  );

  const filters = useMemo<AdminTaskQueryParams>(
    () => ({
      business_id: businessId,
      type: activeTab,
      startDate: appliedRange.start || undefined,
      endDate: appliedRange.end || undefined,
      nameQuery: appliedNameSearch || undefined,
      staffId: selectedStaffId || undefined,
      assignedById: selectedAssignedById || undefined,
      status: selectedStatus,
      page: String(page),
      limit: String(PAGE_SIZE),
    }),
    [
      activeTab,
      appliedNameSearch,
      appliedRange,
      businessId,
      page,
      selectedAssignedById,
      selectedStaffId,
      selectedStatus,
    ]
  );

  const {
    data: tasks,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAdminTaskOverview(filters);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedNameSearch(nameSearch.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [nameSearch]);

  useEffect(() => {
    const now = new Date();
    const nextUtcDay = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      1
    );
    const timer = window.setTimeout(() => void refetch(), nextUtcDay - now.getTime());
    return () => window.clearTimeout(timer);
  }, [refetch, tasks?.statusAsOf]);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    setRangeValue(dates);
    setDraftRange({ start: dateStrings?.[0] || "", end: dateStrings?.[1] || "" });
  };

  const clearPeriod = () => {
    setDraftRange({ start: "", end: "" });
    setAppliedRange({ start: "", end: "" });
    setRangeValue(null);
    setPage(1);
  };

  const selectedStaff = staffOptions.find((staff) => staff.id === selectedStaffId);
  const selectStaffFromLabel = (label: string) => {
    setStaffSearch(label);
    const staff = staffOptions.find((option) => option.label === label);
    setSelectedStaffId(staff?.id || "");
    setPage(1);
  };

  const selectedAssignedBy = headOptions.find((head) => head.id === selectedAssignedById);
  const selectAssignedByFromLabel = (label: string) => {
    setAssignedBySearch(label);
    const head = headOptions.find((option) => option.label === label);
    setSelectedAssignedById(head?.id || "");
    setPage(1);
  };

  const taskList = tasks?.data ?? [];
  const summary = tasks?.summary ?? EMPTY_TASK_SUMMARY;
  const pagination = tasks?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: PAGE_SIZE,
  };
  const totalPages = Math.max(1, pagination.totalPages || 1);

  useEffect(() => {
    if (tasks && page > totalPages) setPage(totalPages);
  }, [page, tasks, totalPages]);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const items: Array<number | "ellipsis"> = [];
    const visiblePages = new Set([1, totalPages, page - 1, page, page + 1]);
    for (let current = 1; current <= totalPages; current += 1) {
      if (visiblePages.has(current)) items.push(current);
      else if (items[items.length - 1] !== "ellipsis") items.push("ellipsis");
    }
    return items;
  }, [page, totalPages]);

  return (
    <div className="space-y-3 p-4 pb-20">
      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Business Tasks</p>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <ListTodo size={18} /> Task Overview
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Track individual assignments and project workstreams across the business.
            </p>
          </div>
          <Button
            className="flex items-center gap-2 border border-cyan-700/50 bg-cyan-600/20 text-cyan-100 hover:bg-cyan-500/20"
            onClick={() => router.push("/admin/tasks/addtask")}
          >
            Add Task <CalendarPlus size={16} />
          </Button>
        </div>
        {appliedRange.start && appliedRange.end && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1">From {appliedRange.start}</span>
            <span className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1">To {appliedRange.end}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Task Filters</p>
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as AdminTaskTab);
                setPage(1);
              }}
            >
              <TabsList className="mt-2 grid h-auto w-full grid-cols-2 gap-1 bg-slate-900/70 sm:grid-cols-4">
                <TabsTrigger className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100" value="all">All Tasks</TabsTrigger>
                <TabsTrigger className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100" value="single">Individual Tasks</TabsTrigger>
                <TabsTrigger className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100" value="project">Project Tasks</TabsTrigger>
                <TabsTrigger className="text-slate-400 data-[state=active]:bg-slate-200/10 data-[state=active]:text-slate-100" value="admin-created">Admin Created</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Select
              value=""
              onValueChange={(value) => {
                if (value === "name") setShowNameFilter(true);
                if (value === "staff") setShowStaffFilter(true);
                if (value === "assigned-by") setShowAssignedByFilter(true);
                if (value === "period") setShowPeriodFilter(true);
              }}
            >
              <SelectTrigger className="w-[180px] border-slate-700 bg-slate-900 text-slate-200">
                <SelectValue placeholder="Add search filter" />
              </SelectTrigger>
              <SelectContent>
                {!showNameFilter && <SelectItem value="name">By task or activity</SelectItem>}
                {!showStaffFilter && <SelectItem value="staff">By staff</SelectItem>}
                {!showAssignedByFilter && <SelectItem value="assigned-by">By assigned by</SelectItem>}
                {!showPeriodFilter && <SelectItem value="period">Within period</SelectItem>}
              </SelectContent>
            </Select>

            {showNameFilter && (
              <div className="relative min-w-[230px]">
                <Input value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} placeholder="Task or activity name" className="border-slate-700 bg-slate-900 pr-9 text-slate-100" />
                <button type="button" aria-label="Remove task or activity filter" onClick={() => { setShowNameFilter(false); setNameSearch(""); setAppliedNameSearch(""); setPage(1); }} className="absolute right-2 top-2 text-slate-400 hover:text-slate-100"><X size={16} /></button>
              </div>
            )}

            {showStaffFilter && (
              <div className="relative min-w-[250px]">
                <Input list="admin-task-staff-options" value={staffSearch} onChange={(event) => selectStaffFromLabel(event.target.value)} placeholder={staffOptionQuery.isLoading ? "Loading staff..." : staffOptionQuery.isError ? "Staff unavailable" : "Search staff"} disabled={staffOptionQuery.isError} className="border-slate-700 bg-slate-900 pr-9 text-slate-100" />
                <datalist id="admin-task-staff-options">{staffOptions.map((staff) => <option key={staff.id} value={staff.label} />)}</datalist>
                <button type="button" aria-label="Remove staff filter" onClick={() => { setShowStaffFilter(false); setStaffSearch(""); setSelectedStaffId(""); setPage(1); }} className="absolute right-2 top-2 text-slate-400 hover:text-slate-100"><X size={16} /></button>
              </div>
            )}

            {showAssignedByFilter && (
              <div className="relative min-w-[250px]">
                <Input list="admin-task-head-options" value={assignedBySearch} onChange={(event) => selectAssignedByFromLabel(event.target.value)} placeholder={headOptionQuery.isLoading ? "Loading heads..." : headOptionQuery.isError ? "Heads unavailable" : "Search assigned by head"} disabled={headOptionQuery.isError} className="border-slate-700 bg-slate-900 pr-9 text-slate-100" />
                <datalist id="admin-task-head-options">{headOptions.map((head) => <option key={head.id} value={head.label} />)}</datalist>
                <button type="button" aria-label="Remove assigned-by filter" onClick={() => { setShowAssignedByFilter(false); setAssignedBySearch(""); setSelectedAssignedById(""); setPage(1); }} className="absolute right-2 top-2 text-slate-400 hover:text-slate-100"><X size={16} /></button>
              </div>
            )}

            {showPeriodFilter && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800/80 bg-slate-950/30 p-2">
                <div className="min-w-[240px]">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">Within Period</p>
                    <button type="button" aria-label="Remove period filter" onClick={() => { setShowPeriodFilter(false); clearPeriod(); }} className="text-slate-400 hover:text-slate-100"><X size={14} /></button>
                  </div>
                  <RangePicker onChange={handleDateChange} value={rangeValue} className="w-full text-slate-100" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }} />
                </div>
                <Button size="sm" disabled={!draftRange.start || !draftRange.end} className="h-9 border border-slate-700/80 bg-slate-100/10 text-slate-100 hover:bg-slate-100/20" onClick={() => { setAppliedRange(draftRange); setPage(1); }}>Apply</Button>
                <Button variant="ghost" size="sm" className="h-9 text-slate-400 hover:text-slate-200" onClick={clearPeriod}>Clear</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4" aria-busy={isFetching}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ListTodo size={16} /> Tasks
            {isFetching && !isLoading && <RefreshCw size={13} className="animate-spin text-cyan-300" aria-label="Updating tasks" />}
          </h2>
          <TaskStatusSummaryBadges summary={summary} selectedStatus={selectedStatus} isLoading={isLoading} onChange={(status) => { setSelectedStatus(status); setPage(1); }} />
        </div>

        {isLoading && <TaskGridSkeleton />}

        {isError && !isLoading && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 px-4 py-8 text-center">
            <p className="text-sm font-medium text-rose-100">Tasks could not be loaded.</p>
            <p className="mt-1 text-xs text-slate-400">Check your connection and try again.</p>
            <Button size="sm" variant="outline" className="mt-4 border-rose-800/70 bg-rose-950/30 text-rose-100 hover:bg-rose-900/40" onClick={() => void refetch()}><RefreshCw size={14} className="mr-2" /> Retry</Button>
          </div>
        )}

        {!isLoading && !isError && taskList.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
            <p className="text-sm text-slate-400">No tasks found.</p>
            <p className="mt-1 text-xs text-slate-600">Try changing or clearing a filter.</p>
          </div>
        )}

        {!isLoading && !isError && taskList.length > 0 && (
          <div className={`grid gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${isFetching ? "opacity-70" : "opacity-100"}`}>
            {taskList.map((task: AdminTaskCard) => (
              <TaskOverviewCard
                key={task._id}
                task={task}
                href={`/admin/tasks/${task._id}`}
                matchLabels={{
                  name: appliedNameSearch,
                  staff: selectedStaff?.label || staffSearch,
                  assignedBy: selectedAssignedBy?.label || assignedBySearch,
                }}
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); setPage((current) => Math.max(1, current - 1)); }} className={page <= 1 ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
                {pageItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {item === "ellipsis" ? <PaginationEllipsis /> : <PaginationLink href="#" isActive={item === page} onClick={(event) => { event.preventDefault(); setPage(item); }}>{item}</PaginationLink>}
                  </PaginationItem>
                ))}
                <PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); setPage((current) => Math.min(totalPages, current + 1)); }} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>
    </div>
  );
};

export default TasksPage;
