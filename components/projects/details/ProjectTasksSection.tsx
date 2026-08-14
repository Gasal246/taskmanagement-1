"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "antd";
import axios from "axios";
import { CalendarDays, ListTodo, Plus, RefreshCw, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  EMPTY_TASK_SUMMARY,
  TaskGridSkeleton,
  TaskOverviewCard,
  TaskStatusSummaryBadges,
} from "@/components/tasks/TaskOverview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectMode } from "./project-details-api";
import type { StaffTaskCard, StaffTaskStatusFilter, StaffTaskSummary } from "@/types/staff-tasks";

const { RangePicker } = DatePicker;
const PAGE_SIZE = 9;

type PersonOption = { id: string; name: string; email: string; avatar_url?: string | null };
type TeamOption = { id: string; name: string; headName: string; memberCount: number };
type TaskTeam = { id: string; name: string };
type ProjectTaskCard = StaffTaskCard & { teams: TaskTeam[] };
type ProjectTasksResponse = {
  data: ProjectTaskCard[];
  summary: StaffTaskSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  people: PersonOption[];
  creationTeams: TeamOption[];
  permissions: { canCreateTasks: boolean };
};

export default function ProjectTasksSection({
  projectId,
  mode,
  canCreateTasks,
}: {
  projectId: string;
  mode: ProjectMode;
  canCreateTasks: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [personId, setPersonId] = useState("");
  const [status, setStatus] = useState<StaffTaskStatusFilter>();
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [range, setRange] = useState({ start: "", end: "" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [dialogTeams, setDialogTeams] = useState<TaskTeam[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedName(name.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [name]);

  const queryKey = [
    "project-tasks",
    projectId,
    { page, appliedName, personId, status, range },
  ] as const;
  const tasks = useQuery<ProjectTasksResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (appliedName) params.set("nameQuery", appliedName);
      if (personId) params.set("personId", personId);
      if (status) params.set("status", status);
      if (range.start) params.set("startDate", range.start);
      if (range.end) params.set("endDate", range.end);
      const response = await axios.get(`/api/project/tasks/${projectId}?${params}`);
      return response.data;
    },
    staleTime: 30_000,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/project/tasks/${projectId}`, {
        task_name: taskName.trim(),
        task_description: description.trim(),
        team_ids: selectedTeams,
      });
      return response.data;
    },
    onSuccess: async (response) => {
      toast.success(response?.message || "Task created successfully");
      setSheetOpen(false);
      setTaskName("");
      setDescription("");
      setSelectedTeams([]);
      await queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-details", projectId, mode] });
      router.push(`/${mode}/tasks/${response.data._id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Task could not be created");
    },
  });

  const response = tasks.data;
  const taskList = response?.data || [];
  const people = response?.people || [];
  const creationTeams = response?.creationTeams || [];
  const summary = response?.summary || EMPTY_TASK_SUMMARY;
  const totalPages = Math.max(1, response?.pagination?.totalPages || 1);
  const selectedPerson = people.find((person) => person.id === personId);
  const mayCreate = canCreateTasks && Boolean(response?.permissions?.canCreateTasks ?? true);

  useEffect(() => {
    if (response && page > totalPages) setPage(totalPages);
  }, [page, response, totalPages]);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const values: Array<number | "ellipsis"> = [];
    const visible = new Set([1, totalPages, page - 1, page, page + 1]);
    for (let current = 1; current <= totalPages; current += 1) {
      if (visible.has(current)) values.push(current);
      else if (values[values.length - 1] !== "ellipsis") values.push("ellipsis");
    }
    return values;
  }, [page, totalPages]);

  const toggleTeam = (teamId: string, checked: boolean) => {
    setSelectedTeams((current) =>
      checked ? Array.from(new Set([...current, teamId])) : current.filter((id) => id !== teamId)
    );
  };

  return (
    <div className="space-y-3">
      {mayCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => setSheetOpen(true)}
            className="gap-2 border border-cyan-700/50 bg-cyan-600/20 text-cyan-100 hover:bg-cyan-500/20"
          >
            <Plus size={16} /> Add Task
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4">
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(320px,2fr)_minmax(220px,1fr)_minmax(290px,auto)_auto]">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Search task or activity"
              className="border-slate-700 bg-slate-900 pl-9 text-slate-100"
            />
            {name && (
              <button type="button" aria-label="Clear search" onClick={() => setName("")} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                <X size={15} />
              </button>
            )}
          </div>
          <Select value={personId || "all"} onValueChange={(value) => { setPersonId(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-full border-slate-700 bg-slate-900 text-slate-200">
              <Users size={15} className="mr-2" />
              <SelectValue placeholder="All team people" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team people</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}{person.email ? ` — ${person.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays size={16} className="shrink-0 text-slate-400" />
            <RangePicker
              value={rangeValue}
              onChange={(dates, values) => {
                setRangeValue(dates);
                setRange({ start: values?.[0] || "", end: values?.[1] || "" });
                setPage(1);
              }}
              className="w-full"
              style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            />
          </div>
          {(appliedName || personId || range.start || status) && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white xl:w-auto"
              onClick={() => {
                setName("");
                setAppliedName("");
                setPersonId("");
                setStatus(undefined);
                setRange({ start: "", end: "" });
                setRangeValue(null);
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4" aria-busy={tasks.isFetching}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ListTodo size={16} /> Tasks
            {tasks.isFetching && !tasks.isLoading && <RefreshCw size={13} className="animate-spin text-cyan-300" />}
          </h3>
          <TaskStatusSummaryBadges
            summary={summary}
            selectedStatus={status}
            isLoading={tasks.isLoading}
            onChange={(value) => { setStatus(value); setPage(1); }}
          />
        </div>

        {tasks.isLoading && <TaskGridSkeleton />}
        {tasks.isError && !tasks.isLoading && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 px-4 py-8 text-center">
            <p className="text-sm font-medium text-rose-100">Project tasks could not be loaded.</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => void tasks.refetch()}>
              <RefreshCw size={14} className="mr-2" /> Retry
            </Button>
          </div>
        )}
        {!tasks.isLoading && !tasks.isError && !taskList.length && (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center">
            <p className="text-sm text-slate-400">No project tasks found.</p>
            <p className="mt-1 text-xs text-slate-600">Try changing a filter or create the first task.</p>
          </div>
        )}
        {!tasks.isLoading && !tasks.isError && taskList.length > 0 && (
          <div className={`grid gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${tasks.isFetching ? "opacity-70" : "opacity-100"}`}>
            {taskList.map((task) => (
              <TaskOverviewCard
                key={task._id}
                task={task}
                href={`/${mode}/tasks/${task._id}`}
                matchLabels={{ name: appliedName, staff: selectedPerson?.name }}
                hideProjectBadge
                supplementalContent={
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <span>Teams:</span>
                    <span className="truncate text-slate-200">{task.teams?.[0]?.name || "No team assigned"}</span>
                    {task.teams?.length > 1 && (
                      <button
                        type="button"
                        className="shrink-0 font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDialogTeams(task.teams.slice(1));
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        +{task.teams.length - 1} more
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
        {!tasks.isLoading && !tasks.isError && totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" className={page <= 1 ? "pointer-events-none opacity-50" : ""} onClick={(event) => { event.preventDefault(); setPage((current) => Math.max(1, current - 1)); }} />
                </PaginationItem>
                {pageItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {item === "ellipsis" ? <PaginationEllipsis /> : <PaginationLink href="#" isActive={item === page} onClick={(event) => { event.preventDefault(); setPage(item); }}>{item}</PaginationLink>}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#" className={page >= totalPages ? "pointer-events-none opacity-50" : ""} onClick={(event) => { event.preventDefault(); setPage((current) => Math.min(totalPages, current + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>

      <Dialog open={dialogTeams.length > 0} onOpenChange={(open) => { if (!open) setDialogTeams([]); }}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Other Teams</DialogTitle>
            <DialogDescription>Additional teams assigned to this project task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {dialogTeams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-xs font-semibold text-cyan-200">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-200">{team.name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-slate-100">Add Project Task</SheetTitle>
            <SheetDescription>
              Create a task and select every project team that will contribute to it.
            </SheetDescription>
          </SheetHeader>
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (taskName.trim().length < 2) return toast.error("Enter a task title");
              if (!selectedTeams.length) return toast.error("Select at least one team");
              createTask.mutate();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="project-task-title" className="text-sm font-medium text-slate-200">Task Title</label>
              <Input id="project-task-title" value={taskName} onChange={(event) => setTaskName(event.target.value)} maxLength={160} placeholder="Enter task title" className="border-slate-700 bg-slate-900" />
            </div>
            <div className="space-y-2">
              <label htmlFor="project-task-description" className="text-sm font-medium text-slate-200">Description</label>
              <Textarea id="project-task-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={6} placeholder="Describe the task" className="border-slate-700 bg-slate-900" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">Select Teams <span className="text-rose-400">*</span></p>
                <span className="text-xs text-slate-500">{selectedTeams.length} selected</span>
              </div>
              {!creationTeams.length ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  No teams are available for task creation.
                </div>
              ) : (
                <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
                  {creationTeams.map((team) => {
                    const checked = selectedTeams.includes(team.id);
                    return (
                      <label key={team.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${checked ? "border-cyan-500/60 bg-cyan-950/35" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
                        <Checkbox checked={checked} onCheckedChange={(value) => toggleTeam(team.id, value === true)} className="mt-1" />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-100">{team.name}</span>
                          <span className="mt-1 block text-xs text-slate-400">Head: {team.headName} · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={createTask.isPending}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending || taskName.trim().length < 2 || !selectedTeams.length} className="bg-cyan-600 text-white hover:bg-cyan-500">
                {createTask.isPending ? "Creating..." : "Create and Open Task"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
