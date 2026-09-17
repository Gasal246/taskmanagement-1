"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Cloud,
  Flag,
  Inbox,
  HardDrive,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  format,
  formatDistanceToNow,
  isBefore,
  isToday,
  startOfDay,
} from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCheckTodo,
  useDeleteTodo,
  useGetAllUserTodos,
  usePostNewTodo,
  useUpdateTodo,
} from "@/query/user/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { readLocalTodos, writeLocalTodos } from "@/lib/todo-local";
import { useSession } from "next-auth/react";
import { resolveSessionUserId } from "@/lib/utils";

type Priority = "low" | "medium" | "high";

export type Todo = {
  _id: string;
  content: string;
  is_completed: boolean;
  priority?: Priority;
  due_date?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type TodoResponse = { data: Todo[]; status: number };
type StatusFilter = "all" | "active" | "completed" | "today" | "overdue";
type SortMode = "newest" | "oldest" | "due" | "priority";

const priorityRank: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const priorityStyles: Record<Priority, string> = {
  high: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  medium: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  low: "border-sky-400/20 bg-sky-400/10 text-sky-300",
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const isOverdue = (todo: Todo) =>
  Boolean(
    todo.due_date &&
      !todo.is_completed &&
      isBefore(startOfDay(new Date(todo.due_date)), startOfDay(new Date()))
  );

const safeTime = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

type TodoWorkspaceProps = {
  storageMode?: "cloud" | "local";
  userId?: string;
  showStorageStatus?: boolean;
  onStorageAccessChanged?: () => void;
};

const TodoWorkspace = ({
  storageMode = "cloud",
  userId = "",
  showStorageStatus = false,
  onStorageAccessChanged,
}: TodoWorkspaceProps) => {
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();
  const ownerId = userId || resolveSessionUserId(session);
  const todoQueryKey = useMemo(() => ["todos", ownerId] as const, [ownerId]);
  const reduceMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("low");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [localTodos, setLocalTodos] = useState<Todo[]>([]);
  const [localLoading, setLocalLoading] = useState(storageMode === "local");
  const localViewRef = useRef<Todo[]>([]);
  const localPersistedRef = useRef<Todo[]>([]);

  const { data, isLoading: cloudLoading, isError, refetch } = useGetAllUserTodos(ownerId, storageMode === "cloud");
  const { mutateAsync: addTodoRequest, isPending: isAdding } = usePostNewTodo();
  const { mutateAsync: toggleTodoRequest } = useCheckTodo();
  const { mutateAsync: deleteTodoRequest } = useDeleteTodo();
  const { mutateAsync: updateTodoRequest } = useUpdateTodo();

  useEffect(() => {
    if (storageMode !== "local") {
      setLocalLoading(false);
      return;
    }
    const stored = readLocalTodos(userId);
    localViewRef.current = stored;
    localPersistedRef.current = stored;
    setLocalTodos(stored);
    setLocalLoading(false);
  }, [storageMode, userId]);

  const cloudTodos: Todo[] = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data]);
  const todos = storageMode === "local" ? localTodos : cloudTodos;
  const isLoading = storageMode === "local" ? localLoading : cloudLoading || sessionStatus === "loading" || !ownerId;
  const activeCount = todos.filter((todo) => !todo.is_completed).length;
  const completedCount = todos.length - activeCount;
  const overdueCount = todos.filter(isOverdue).length;
  const completion = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  const setCachedTodos = useCallback(
    (updater: (current: Todo[]) => Todo[]) => {
      if (storageMode === "local") {
        const next = updater(localViewRef.current);
        localViewRef.current = next;
        setLocalTodos(next);
        return;
      }
      queryClient.setQueryData<TodoResponse>(todoQueryKey, (current) => ({
        status: current?.status ?? 200,
        data: updater(current?.data ?? []),
      }));
    },
    [queryClient, storageMode, todoQueryKey]
  );

  const commitLocalTodos = useCallback(
    (updater: (current: Todo[]) => Todo[]) => {
      const nextPersisted = updater(localPersistedRef.current);
      writeLocalTodos(userId, nextPersisted);
      localPersistedRef.current = nextPersisted;
      const nextView = updater(localViewRef.current);
      localViewRef.current = nextView;
      setLocalTodos(nextView);
    },
    [userId]
  );

  const reportStorageError = useCallback((error: any, fallback: string) => {
    if (error?.response?.status === 403) onStorageAccessChanged?.();
    toast.error(getErrorMessage(error, fallback));
  }, [onStorageAccessChanged]);

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      pending ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const addTodo = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isAdding) return;

    const selectedPriority = priority;
    const selectedDueDate = dueDate;
    const tempId = storageMode === "local"
      ? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      : `temp-${Date.now()}`;
    const optimisticTodo: Todo = {
      _id: tempId,
      content,
      is_completed: false,
      priority,
      due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    setInput("");
    setPriority("low");
    setDueDate("");
    if (storageMode === "local") {
      try {
        commitLocalTodos((current) => [optimisticTodo, ...current]);
        toast.success("Task saved on this device");
      } catch (error) {
        setInput(content);
        setPriority(selectedPriority);
        setDueDate(selectedDueDate);
        toast.error(getErrorMessage(error, "Could not save task on this device"));
      }
      return;
    }

    setCachedTodos((current) => [optimisticTodo, ...current]);

    try {
      const response = await addTodoRequest({
        content,
        priority,
        due_date: optimisticTodo.due_date,
      });
      if (response?.status !== 201 || !response?.data) throw new Error(response?.message || "Could not add task");
      setCachedTodos((current) =>
        current.map((todo) => (todo._id === tempId ? response.data : todo))
      );
      toast.success("Task added");
    } catch (error) {
      setCachedTodos((current) => current.filter((todo) => todo._id !== tempId));
      setInput(content);
      setPriority(selectedPriority);
      setDueDate(selectedDueDate);
      reportStorageError(error, "Could not add task");
    }
  };

  const toggleTodo = useCallback(
    async (id: string) => {
      if (pendingIds.has(id)) return;
      const original = todos.find((todo) => todo._id === id);
      if (!original) return;
      if (storageMode === "local") {
        try {
          markPending(id, true);
          commitLocalTodos((current) =>
            current.map((todo) => todo._id === id ? { ...todo, is_completed: !todo.is_completed } : todo)
          );
        } catch (error) {
          toast.error(getErrorMessage(error, "Could not update task on this device"));
        } finally {
          markPending(id, false);
        }
        return;
      }
      markPending(id, true);
      setCachedTodos((current) =>
        current.map((todo) =>
          todo._id === id ? { ...todo, is_completed: !todo.is_completed } : todo
        )
      );
      try {
        const response = await toggleTodoRequest({ todo_id: id });
        if (response?.status !== 200 || !response?.data) throw new Error(response?.message || "Could not update task");
        setCachedTodos((current) =>
          current.map((todo) => (todo._id === id ? response.data : todo))
        );
      } catch (error) {
        setCachedTodos((current) =>
          current.map((todo) => (todo._id === id ? original : todo))
        );
        reportStorageError(error, "Could not update task");
      } finally {
        markPending(id, false);
      }
    },
    [commitLocalTodos, markPending, pendingIds, reportStorageError, setCachedTodos, storageMode, todos, toggleTodoRequest]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      if (pendingIds.has(id)) return;
      const originalIndex = todos.findIndex((todo) => todo._id === id);
      const original = todos[originalIndex];
      if (!original) return;

      let deletionStarted = false;
      let deletionUndone = false;

      const restoreTask = () => {
        setCachedTodos((current) => {
          if (current.some((todo) => todo._id === id)) return current;
          const next = [...current];
          next.splice(Math.min(Math.max(0, originalIndex), next.length), 0, original);
          return next;
        });
        markPending(id, false);
      };

      const commitDeletion = async () => {
        if (deletionStarted || deletionUndone) return;
        deletionStarted = true;
        try {
          if (storageMode === "local") {
            commitLocalTodos((current) => current.filter((todo) => todo._id !== id));
          } else {
            const response = await deleteTodoRequest(id);
            if (response?.status !== 200) throw new Error(response?.message || "Could not delete task");
          }
        } catch (error) {
          restoreTask();
          reportStorageError(error, "Could not delete task");
        } finally {
          markPending(id, false);
        }
      };

      markPending(id, true);
      setCachedTodos((current) => current.filter((todo) => todo._id !== id));

      toast.success("Task removed", {
        description: "It will be permanently deleted when this message closes.",
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            if (deletionStarted) return;
            deletionUndone = true;
            restoreTask();
            toast.success("Task restored");
          },
        },
        onAutoClose: () => void commitDeletion(),
        onDismiss: () => void commitDeletion(),
      });
    },
    [commitLocalTodos, deleteTodoRequest, markPending, pendingIds, reportStorageError, setCachedTodos, storageMode, todos]
  );

  const updateTodo = useCallback(
    async (id: string, changes: Partial<Pick<Todo, "content" | "priority" | "due_date">>) => {
      if (pendingIds.has(id)) return false;
      const original = todos.find((todo) => todo._id === id);
      if (!original) return false;
      if (storageMode === "local") {
        try {
          markPending(id, true);
          commitLocalTodos((current) =>
            current.map((todo) => todo._id === id ? { ...todo, ...changes, updatedAt: new Date().toISOString() } : todo)
          );
          toast.success("Task updated");
          return true;
        } catch (error) {
          toast.error(getErrorMessage(error, "Could not save task on this device"));
          return false;
        } finally {
          markPending(id, false);
        }
      }
      markPending(id, true);
      setCachedTodos((current) =>
        current.map((todo) => (todo._id === id ? { ...todo, ...changes } : todo))
      );
      try {
        const response = await updateTodoRequest({ todo_id: id, ...changes });
        if (response?.status !== 200 || !response?.data) throw new Error(response?.message || "Could not save task");
        setCachedTodos((current) =>
          current.map((todo) => (todo._id === id ? response.data : todo))
        );
        toast.success("Task updated");
        return true;
      } catch (error) {
        setCachedTodos((current) =>
          current.map((todo) => (todo._id === id ? original : todo))
        );
        reportStorageError(error, "Could not save task");
        return false;
      } finally {
        markPending(id, false);
      }
    },
    [commitLocalTodos, markPending, pendingIds, reportStorageError, setCachedTodos, storageMode, todos, updateTodoRequest]
  );

  const clearCompleted = async () => {
    const completed = todos.filter((todo) => todo.is_completed);
    if (!completed.length || isClearing) return;
    setIsClearing(true);
    if (storageMode === "local") {
      try {
        commitLocalTodos((current) => current.filter((todo) => !todo.is_completed));
        toast.success(`${completed.length} completed task${completed.length === 1 ? "" : "s"} cleared`);
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not clear completed tasks"));
      } finally {
        setIsClearing(false);
      }
      return;
    }
    setCachedTodos((current) => current.filter((todo) => !todo.is_completed));
    const results = await Promise.allSettled(completed.map((todo) => deleteTodoRequest(todo._id)));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed) {
      await queryClient.invalidateQueries({ queryKey: todoQueryKey });
      toast.error(`${failed} task${failed === 1 ? "" : "s"} could not be removed`);
    } else {
      toast.success(`${completed.length} completed task${completed.length === 1 ? "" : "s"} cleared`);
    }
    setIsClearing(false);
  };

  const filteredTodos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return todos
      .filter((todo) => {
        if (normalizedSearch && !todo.content.toLowerCase().includes(normalizedSearch)) return false;
        if (priorityFilter !== "all" && (todo.priority || "low") !== priorityFilter) return false;
        if (status === "active" && todo.is_completed) return false;
        if (status === "completed" && !todo.is_completed) return false;
        if (status === "today" && (!todo.due_date || !isToday(new Date(todo.due_date)))) return false;
        if (status === "overdue" && !isOverdue(todo)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "oldest") return safeTime(a.createdAt) - safeTime(b.createdAt);
        if (sort === "due") return safeTime(a.due_date) - safeTime(b.due_date);
        if (sort === "priority") return priorityRank[b.priority || "low"] - priorityRank[a.priority || "low"];
        return safeTime(b.createdAt) - safeTime(a.createdAt);
      });
  }, [priorityFilter, search, sort, status, todos]);

  const activeTodos = filteredTodos.filter((todo) => !todo.is_completed);
  const completedTodos = filteredTodos.filter((todo) => todo.is_completed);
  const hasFilters = Boolean(search || status !== "all" || priorityFilter !== "all" || sort !== "newest");

  if (isLoading) return <TodoWorkspaceSkeleton />;

  if (storageMode === "cloud" && isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm rounded-3xl border border-rose-400/20 bg-slate-950/60 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto mb-4 h-9 w-9 text-rose-300" />
          <h1 className="text-lg font-semibold text-white">We couldn&apos;t load your tasks</h1>
          <p className="mt-2 text-sm text-slate-400">Check your connection and try again.</p>
          <button onClick={() => refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 text-slate-100">
      <header className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/65 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="relative px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_15%_100%,rgba(16,185,129,0.10),transparent_35%)]" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                <Sparkles size={14} /> Workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Personal Todo</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">Capture what matters, plan the day, and keep momentum in one calm workspace.</p>
              {showStorageStatus && (
                <span className={cn(
                  "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                  storageMode === "cloud"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-sky-400/20 bg-sky-400/10 text-sky-300"
                )}>
                  {storageMode === "cloud" ? <Cloud size={12} /> : <HardDrive size={12} />}
                  {storageMode === "cloud" ? "Cloud synced" : "Saved on this device"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Open" value={activeCount} tone="cyan" />
              <Stat label="Done" value={completedCount} tone="emerald" />
              <Stat label="Overdue" value={overdueCount} tone="rose" />
              <Stat label="Progress" value={`${completion}%`} tone="violet" />
            </div>
          </div>
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={false}
              animate={{ width: `${completion}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
            />
          </div>
        </div>
      </header>

      <section className="mb-5 rounded-3xl border border-white/10 bg-slate-950/60 p-3 shadow-xl backdrop-blur-xl sm:p-4">
        <form onSubmit={addTodo}>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-slate-700/80 bg-slate-900/80 px-3 transition focus-within:border-cyan-400/60 focus-within:ring-4 focus-within:ring-cyan-400/5">
              <Plus className="mr-2 h-5 w-5 shrink-0 text-cyan-300" />
              <input
                value={input}
                maxLength={240}
                onChange={(event) => setInput(event.target.value)}
                placeholder="What needs to get done?"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base"
                aria-label="New task name"
              />
              <span className="hidden text-[10px] text-slate-600 sm:block">{input.length}/240</span>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isAdding}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
            >
              {isAdding ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
              <span className="hidden sm:inline">Add task</span>
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Priority</p>
              <div className="inline-flex rounded-xl border border-slate-700/80 bg-slate-900/70 p-1" role="group" aria-label="Task priority">
                {(["low", "medium", "high"] as Priority[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPriority(item)}
                    aria-pressed={priority === item}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                      priority === item
                        ? priorityStyles[item]
                        : "border border-transparent text-slate-500 hover:text-slate-200"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="w-full sm:w-auto">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Due date <span className="normal-case tracking-normal text-slate-600">(optional)</span></span>
              <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 transition focus-within:border-cyan-400/60">
                <CalendarDays size={14} className="text-slate-500" />
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-300 outline-none [color-scheme:dark] sm:w-32" />
                {dueDate && <button type="button" onClick={() => setDueDate("")} className="rounded p-0.5 text-slate-500 transition hover:text-white" aria-label="Clear due date"><X size={12} /></button>}
              </span>
            </label>
          </div>
        </form>
      </section>

      <section className="mb-5 rounded-2xl border border-white/10 bg-slate-950/50 p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-white" aria-label="Clear search"><X size={14} /></button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {(["all", "active", "today", "overdue", "completed"] as StatusFilter[]).map((item) => (
              <button key={item} onClick={() => setStatus(item)} className={cn("whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold capitalize transition", status === item ? "bg-white text-slate-950" : "bg-slate-900/70 text-slate-400 hover:text-white")}>{item}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Filter priority</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as Priority | "all")} className="h-10 w-full appearance-none rounded-xl border border-slate-700/70 bg-slate-900/70 pl-3 pr-8 text-xs font-medium text-slate-300 outline-none sm:w-32">
                <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <Flag className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </label>
            <label className="relative flex-1 sm:flex-none">
              <span className="sr-only">Sort tasks</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-10 w-full appearance-none rounded-xl border border-slate-700/70 bg-slate-900/70 pl-3 pr-8 text-xs font-medium text-slate-300 outline-none sm:w-32">
                <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="due">Due date</option><option value="priority">Priority</option>
              </select>
              <ArrowDownUp className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </label>
            {hasFilters && <button onClick={() => { setSearch(""); setStatus("all"); setPriorityFilter("all"); setSort("newest"); }} className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 text-slate-400 transition hover:text-white" aria-label="Reset filters"><RotateCcw size={15} /></button>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TaskColumn title="To do" count={activeTodos.length} icon={Circle} accent="cyan" emptyMessage={hasFilters ? "No open tasks match these filters." : "Your slate is clear. Add a task above."}>
          <TaskList todos={activeTodos} pendingIds={pendingIds} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} reduceMotion={Boolean(reduceMotion)} />
        </TaskColumn>
        <TaskColumn
          title="Completed"
          count={completedTodos.length}
          icon={CheckCircle2}
          accent="emerald"
          emptyMessage={hasFilters ? "No completed tasks match these filters." : "Completed tasks will appear here."}
          action={completedCount > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild><button className="text-xs font-semibold text-slate-500 transition hover:text-rose-300">Clear completed</button></AlertDialogTrigger>
              <AlertDialogContent className="border-slate-700 bg-slate-950 text-white">
                <AlertDialogHeader><AlertDialogTitle>Clear completed tasks?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">This permanently removes {completedCount} completed task{completedCount === 1 ? "" : "s"}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white">Keep tasks</AlertDialogCancel><AlertDialogAction onClick={clearCompleted} className="bg-rose-500 text-white hover:bg-rose-400">{isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Clear tasks</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : undefined}
        >
          <TaskList todos={completedTodos} pendingIds={pendingIds} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} reduceMotion={Boolean(reduceMotion)} />
        </TaskColumn>
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: number | string; tone: "cyan" | "emerald" | "rose" | "violet" }) => {
  const tones = { cyan: "text-cyan-300", emerald: "text-emerald-300", rose: "text-rose-300", violet: "text-violet-300" };
  return <div className="min-w-[76px] rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2"><p className={cn("text-lg font-bold", tones[tone])}>{value}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p></div>;
};

const TaskColumn = ({ title, count, icon: Icon, accent, action, emptyMessage, children }: { title: string; count: number; icon: React.ElementType; accent: "cyan" | "emerald"; action?: React.ReactNode; emptyMessage: string; children: React.ReactNode }) => (
  <section className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 shadow-xl backdrop-blur-xl">
    <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent === "cyan" ? "bg-cyan-400/10 text-cyan-300" : "bg-emerald-400/10 text-emerald-300")}><Icon size={18} /></span>
      <div><h2 className="font-semibold text-white">{title}</h2><p className="text-[11px] text-slate-500">{count} shown</p></div>
      <div className="ml-auto">{action}</div>
    </div>
    <div className="flex-1 p-3 sm:p-4">
      {count === 0 ? <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60"><Inbox className="h-5 w-5 text-slate-600" /></span><p className="max-w-[250px] text-sm text-slate-500">{emptyMessage}</p></div> : children}
    </div>
  </section>
);

const TaskList = ({ todos, pendingIds, onToggle, onDelete, onUpdate, reduceMotion }: { todos: Todo[]; pendingIds: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, changes: Partial<Pick<Todo, "content" | "priority" | "due_date">>) => Promise<boolean>; reduceMotion: boolean }) => (
  <motion.div layout={!reduceMotion} className="space-y-2.5">
    <AnimatePresence initial={false} mode="popLayout">
      {todos.map((todo) => <TaskCard key={todo._id} todo={todo} pending={pendingIds.has(todo._id) || todo._id.startsWith("temp-")} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} reduceMotion={reduceMotion} />)}
    </AnimatePresence>
  </motion.div>
);

const TaskCard = memo(({ todo, pending, onToggle, onDelete, onUpdate, reduceMotion }: { todo: Todo; pending: boolean; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, changes: Partial<Pick<Todo, "content" | "priority" | "due_date">>) => Promise<boolean>; reduceMotion: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(todo.content);
  const [priority, setPriority] = useState<Priority>(todo.priority || "low");
  const [dueDate, setDueDate] = useState(todo.due_date ? format(new Date(todo.due_date), "yyyy-MM-dd") : "");
  const overdue = isOverdue(todo);

  const cancelEdit = () => { setContent(todo.content); setPriority(todo.priority || "low"); setDueDate(todo.due_date ? format(new Date(todo.due_date), "yyyy-MM-dd") : ""); setEditing(false); };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    const saved = await onUpdate(todo._id, { content: content.trim(), priority, due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null });
    if (saved) setEditing(false);
  };

  return (
    <motion.article
      layout="position"
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn("group rounded-2xl border bg-slate-900/65 p-3.5 transition-colors hover:bg-slate-900/90 sm:p-4", todo.is_completed ? "border-emerald-400/10" : overdue ? "border-rose-400/20" : "border-slate-800")}
    >
      {editing ? (
        <form onSubmit={saveEdit} className="space-y-3">
          <input autoFocus value={content} maxLength={240} onChange={(event) => setContent(event.target.value)} className="todo-field h-10 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="todo-field"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="todo-field [color-scheme:dark]" />
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={cancelEdit} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">Cancel</button><button type="submit" disabled={pending || !content.trim()} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">Save changes</button></div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <button onClick={() => onToggle(todo._id)} disabled={pending} className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-wait", todo.is_completed ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600 bg-slate-950/60 text-transparent hover:border-cyan-300 hover:text-cyan-300")} aria-label={todo.is_completed ? "Mark task incomplete" : "Mark task complete"}>
            {pending ? <Loader2 size={13} className="animate-spin text-slate-400" /> : todo.is_completed ? <Check size={14} strokeWidth={3} /> : <Circle size={9} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("break-words text-sm font-medium leading-6 transition", todo.is_completed ? "text-slate-500 line-through decoration-slate-600" : "text-slate-100")}>{todo.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold capitalize", priorityStyles[todo.priority || "low"])}><Flag size={10} />{todo.priority || "low"}</span>
              {todo.due_date && <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold", overdue ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : isToday(new Date(todo.due_date)) ? "border-violet-400/20 bg-violet-400/10 text-violet-300" : "border-slate-700/70 bg-slate-950/50 text-slate-400")}><CalendarDays size={10} />{overdue ? "Overdue · " : isToday(new Date(todo.due_date)) ? "Today · " : ""}{format(new Date(todo.due_date), "MMM d")}</span>}
              <span className="text-[10px] text-slate-600">Added {formatDistanceToNow(new Date(todo.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button onClick={() => setEditing(true)} disabled={pending} className="rounded-lg p-2 text-slate-500 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-40" aria-label="Edit task"><Pencil size={14} /></button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button disabled={pending} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40" aria-label="Delete task"><Trash2 size={14} /></button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-slate-700 bg-slate-950 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">“{todo.content}” will be removed. You will have 6 seconds to undo this action.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(todo._id)} className="bg-rose-500 text-white hover:bg-rose-400">Delete task</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </motion.article>
  );
});
TaskCard.displayName = "TaskCard";

const TodoWorkspaceSkeleton = () => (
  <div className="space-y-5 pb-8"><Skeleton className="h-48 rounded-[28px] bg-slate-900/70" /><Skeleton className="h-28 rounded-3xl bg-slate-900/70" /><Skeleton className="h-16 rounded-2xl bg-slate-900/70" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-[430px] rounded-3xl bg-slate-900/70" /><Skeleton className="h-[430px] rounded-3xl bg-slate-900/70" /></div></div>
);

export default TodoWorkspace;
