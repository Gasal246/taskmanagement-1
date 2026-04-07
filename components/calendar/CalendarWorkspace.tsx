"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addHours,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ListChecks,
  Menu,
  Plus,
  Search,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { HEAD_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useGetAllStaffs } from "@/query/client/adminQueries";
import {
  useCreateCalendarEvent,
  useGetCalendarFeed,
  useUpdateCalendarItemStatus,
} from "@/query/calendar/queries";
import type { RootState } from "@/redux/store";

type CalendarMode = "admin" | "staff";
type ViewMode = "calendar" | "tasks";
type CalendarItemType = "task" | "enquiry" | "custom";
type AssignmentMode = "self" | "staff";

type CalendarItem = {
  id: string;
  type: CalendarItemType;
  sourceId: string;
  title: string;
  description?: string;
  start: string | null;
  end: string | null;
  status?: string;
  action?: string;
  priority?: number | null;
  enquiryUuid?: string;
  assignedLabel?: string;
  createdBy?: string;
  isProjectTask?: boolean;
};

type CalendarWorkspaceProps = {
  mode: CalendarMode;
};

type StaffOption = {
  id: string;
  name: string;
  email?: string;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 58;
const WEEK_STARTS_ON = 0 as const;

const TYPE_STYLES: Record<CalendarItemType, string> = {
  task: "border-cyan-400/50 bg-cyan-400/15 text-cyan-100",
  custom: "border-sky-400/50 bg-sky-400/15 text-sky-100",
  enquiry: "border-amber-400/50 bg-amber-400/15 text-amber-100",
};

const TYPE_DOT: Record<CalendarItemType, string> = {
  task: "bg-cyan-300",
  custom: "bg-sky-300",
  enquiry: "bg-amber-300",
};

const parseItemDate = (value?: string | null) => {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const isPendingItem = (item: CalendarItem) => {
  const status = String(item.status || "").toLowerCase();
  return status !== "completed" && status !== "cancelled" && status !== "closed";
};

const itemTouchesDate = (item: CalendarItem, date: Date) => {
  const start = parseItemDate(item.start);
  const end = parseItemDate(item.end) || start;
  if (!start && !end) return false;

  const itemStart = start || end;
  const itemEnd = end || start;
  if (!itemStart || !itemEnd) return false;

  return itemStart.getTime() <= endOfDay(date).getTime() && itemEnd.getTime() >= startOfDay(date).getTime();
};

const toLocalInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const resolveDomainId = (roleName: string, domainData: any) => {
  switch (roleName) {
    case "REGION_HEAD":
    case "REGION_STAFF":
      return domainData?.region_id;
    case "AREA_HEAD":
    case "AREA_STAFF":
      return domainData?.area_id;
    case "LOCATION_HEAD":
    case "LOCATION_STAFF":
      return domainData?.location_id;
    case "REGION_DEP_HEAD":
    case "REGION_DEP_STAFF":
    case "AREA_DEP_HEAD":
    case "AREA_DEP_STAFF":
    case "LOCATION_DEP_HEAD":
    case "LOCATION_DEP_STAFF":
      return domainData?.department_id;
    default:
      return domainData?.value || domainData?._id;
  }
};

const normalizeStaff = (row: any): StaffOption | null => {
  const user = row?.user_id || row?.staff_id || row?.user || row;
  if (!user?._id) return null;
  return {
    id: String(user._id),
    name: String(user.name || row?.name || "Unnamed staff"),
    email: String(user.email || row?.email || ""),
  };
};

const formatItemWindow = (item: CalendarItem) => {
  const start = parseItemDate(item.start);
  const end = parseItemDate(item.end);
  if (!start && !end) return "No time set";
  if (start && end && isSameDay(start, end)) {
    return `${format(start, "EEEE, d MMM")} • ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  }
  if (start && end) {
    return `${format(start, "d MMM, h:mm a")} → ${format(end, "d MMM, h:mm a")}`;
  }
  return format(start || end || new Date(), "EEEE, d MMM • h:mm a");
};

const CalendarTaskDialog = ({
  open,
  onOpenChange,
  mode,
  canAssignStaff,
  staffOptions,
  isStaffLoading,
  defaultStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CalendarMode;
  canAssignStaff: boolean;
  staffOptions: StaffOption[];
  isStaffLoading: boolean;
  defaultStart: Date;
}) => {
  const createEvent = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("self");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setStartValue(toLocalInputValue(defaultStart));
    setEndValue(toLocalInputValue(addHours(defaultStart, 1)));
    setAssignmentMode("self");
    setSelectedStaffIds([]);
    setStaffSearch("");
  }, [defaultStart, open]);

  const filteredStaffOptions = useMemo(() => {
    const search = staffSearch.trim().toLowerCase();
    if (!search) return staffOptions;
    return staffOptions.filter((staff) =>
      `${staff.name} ${staff.email || ""}`.toLowerCase().includes(search)
    );
  }, [staffOptions, staffSearch]);

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds((current) =>
      current.includes(staffId)
        ? current.filter((id) => id !== staffId)
        : [...current, staffId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Task title is required.");
      return;
    }
    if (!startValue || !endValue) {
      toast.error("Start and due time are required.");
      return;
    }

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      toast.error("Invalid task time.");
      return;
    }
    if (endDate.getTime() < startDate.getTime()) {
      toast.error("Due time must be after start time.");
      return;
    }
    if (assignmentMode === "staff" && selectedStaffIds.length === 0) {
      toast.error("Select at least one staff member.");
      return;
    }

    try {
      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        attendee_ids: assignmentMode === "staff" ? selectedStaffIds : undefined,
        status: "To Do",
      });
      toast.success("Task added to calendar.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add task.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border border-slate-700/80 bg-slate-950 text-slate-100 shadow-2xl sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl">Add Task</DialogTitle>
          <div className="flex w-fit rounded-full border border-slate-800 bg-slate-900/80 p-1 text-xs">
            <span className="rounded-full bg-cyan-500 px-3 py-1 font-semibold text-slate-950">Task</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="The Task Title"
            className="border-0 border-b border-slate-700 bg-transparent px-0 text-lg font-semibold focus-visible:ring-0"
          />

          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              Start
              <Input
                type="datetime-local"
                value={startValue}
                onChange={(event) => setStartValue(event.target.value)}
                className="border-slate-700 bg-slate-950/80 text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              Due
              <Input
                type="datetime-local"
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
                className="border-slate-700 bg-slate-950/80 text-slate-100"
              />
            </label>
          </div>

          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="This is the description of the task"
            className="min-h-32 border-slate-700 bg-slate-900/70 text-slate-100"
          />

          {canAssignStaff && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-sm font-semibold text-slate-200">
                {mode === "admin" ? "Assign task" : "Assign as head"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAssignmentMode("self")}
                  className={cn(
                    "border",
                    assignmentMode === "self"
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-800 bg-slate-950/80 text-slate-400"
                  )}
                >
                  <UserRound size={14} className="mr-1.5" />
                  Self
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAssignmentMode("staff")}
                  className={cn(
                    "border",
                    assignmentMode === "staff"
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-800 bg-slate-950/80 text-slate-400"
                  )}
                >
                  <UsersRound size={14} className="mr-1.5" />
                  Select staff
                </Button>
              </div>

              {assignmentMode === "staff" && (
                <div className="space-y-3">
                  <Input
                    value={staffSearch}
                    onChange={(event) => setStaffSearch(event.target.value)}
                    placeholder="Search staff"
                    className="border-slate-800 bg-slate-950/80"
                  />
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {isStaffLoading && <LoaderSpin size={18} title="Loading staff..." />}
                    {!isStaffLoading && filteredStaffOptions.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-800 p-4 text-sm text-slate-500">
                        No assignable staff found.
                      </p>
                    )}
                    {!isStaffLoading &&
                      filteredStaffOptions.map((staff) => (
                        <label
                          key={staff.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                        >
                          <Checkbox
                            checked={selectedStaffIds.includes(staff.id)}
                            onCheckedChange={() => toggleStaff(staff.id)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-200">{staff.name}</span>
                            <span className="block truncate text-xs text-slate-500">{staff.email || "No email"}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createEvent.isPending}
            className="rounded-full bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400"
          >
            {createEvent.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CalendarWorkspace = ({ mode }: CalendarWorkspaceProps) => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStart, setCreateStart] = useState(new Date());
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [selectedGroupItems, setSelectedGroupItems] = useState<CalendarItem[]>([]);
  const [roleName, setRoleName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [domainData, setDomainData] = useState<any>(null);
  const [headStaffOptions, setHeadStaffOptions] = useState<StaffOption[]>([]);
  const [isHeadStaffLoading, setIsHeadStaffLoading] = useState(false);
  const statusMutation = useUpdateCalendarItemStatus();

  const isAdmin = mode === "admin";
  const isHead = HEAD_ROLES.includes(roleName);
  const canAssignStaff = isAdmin || isHead;

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON }), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const { data: adminStaffRows = [], isLoading: isAdminStaffLoading } = useGetAllStaffs(
    isAdmin ? businessData?._id : undefined
  );

  const adminStaffOptions = useMemo(() => {
    const rows = Array.isArray(adminStaffRows) ? adminStaffRows : [];
    return rows.map(normalizeStaff).filter(Boolean) as StaffOption[];
  }, [adminStaffRows]);

  const staffOptions = isAdmin ? adminStaffOptions : headStaffOptions;
  const isStaffLoading = isAdmin ? isAdminStaffLoading : isHeadStaffLoading;

  useEffect(() => {
    const roleCookie = Cookies.get("user_role");
    const domainCookie = Cookies.get("user_domain");
    if (!roleCookie) return;

    try {
      const parsedRole = JSON.parse(roleCookie);
      setRoleName(parsedRole?.role_name || parsedRole?.role || "");
      setRoleId(parsedRole?._id || "");
    } catch {
      setRoleName("");
      setRoleId("");
    }

    if (domainCookie) {
      try {
        setDomainData(JSON.parse(domainCookie));
      } catch {
        setDomainData(null);
      }
    }
  }, []);

  useEffect(() => {
    if (mode !== "staff" || !isHead || !roleId || !domainData) return;

    const domainId = resolveDomainId(roleName, domainData);
    if (!domainId) return;

    let active = true;
    const loadHeadStaff = async () => {
      setIsHeadStaffLoading(true);
      try {
        const response = await fetch(`/api/staff/get-for-heads?role_id=${roleId}&domain_id=${domainId}`);
        const payload = await response.json();
        if (!active) return;
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        setHeadStaffOptions(rows.map(normalizeStaff).filter(Boolean) as StaffOption[]);
      } catch (error) {
        if (active) setHeadStaffOptions([]);
      } finally {
        if (active) setIsHeadStaffLoading(false);
      }
    };

    loadHeadStaff();

    return () => {
      active = false;
    };
  }, [domainData, isHead, mode, roleId, roleName]);

  const { data, isLoading, isFetching } = useGetCalendarFeed({
    includeTasks: true,
    includeEnquiries: true,
    includeCustomEvents: true,
    search,
  });

  const items = useMemo<CalendarItem[]>(
    () => (Array.isArray(data?.items) ? data.items : []),
    [data?.items]
  );

  const pendingItems = useMemo(
    () => items.filter((item) => isPendingItem(item)),
    [items]
  );

  const pendingForDate = (date: Date) =>
    pendingItems.filter((item) => itemTouchesDate(item, date));

  const getEventLayout = (item: CalendarItem) => {
    const parsedStart = parseItemDate(item.start);
    if (!parsedStart) return null;

    const parsedEnd = parseItemDate(item.end);
    const effectiveEnd = parsedEnd || addHours(parsedStart, 1);
    if (parsedStart.getTime() > weekEnd.getTime() || effectiveEnd.getTime() < weekStart.getTime()) {
      return null;
    }

    const startDayIndex = weekDays.findIndex((day) => isSameDay(day, parsedStart));
    const endDayIndex = parsedEnd
      ? weekDays.findIndex((day) => isSameDay(day, parsedEnd))
      : startDayIndex;

    const clampedStartIndex = Math.max(0, startDayIndex);
    const clampedEndIndex = Math.min(
      weekDays.length - 1,
      endDayIndex >= 0 ? endDayIndex : clampedStartIndex
    );

    if (clampedStartIndex < 0 || clampedStartIndex >= weekDays.length) return null;

    const spansMultipleDays = Boolean(parsedEnd && clampedEndIndex > clampedStartIndex);
    const endHasTime = Boolean(
      parsedEnd && (parsedEnd.getHours() !== 0 || parsedEnd.getMinutes() !== 0)
    );
    const shouldUseEndForHeight = Boolean(
      parsedEnd &&
      isSameDay(parsedStart, parsedEnd) &&
      parsedEnd.getTime() > parsedStart.getTime() &&
      endHasTime
    );
    const visualEnd = shouldUseEndForHeight && parsedEnd ? parsedEnd : addHours(parsedStart, 1);
    const hourKey = `${parsedStart.getHours()}-${parsedStart.getMinutes()}`;

    return {
      displayDay: weekDays[clampedStartIndex],
      spanDays: spansMultipleDays ? clampedEndIndex - clampedStartIndex + 1 : 1,
      start: parsedStart,
      visualEnd,
      hourKey,
    };
  };

  const eventGroupsForDay = (date: Date) => {
    const groups = new Map<string, { layout: NonNullable<ReturnType<typeof getEventLayout>>; items: CalendarItem[] }>();

    items.forEach((item) => {
      const layout = getEventLayout(item);
      if (!layout || !isSameDay(layout.displayDay, date)) return;

      const key = `${format(layout.displayDay, "yyyy-MM-dd")}-${layout.hourKey}-${layout.spanDays}`;
      const group = groups.get(key);
      if (group) {
        group.items.push(item);
      } else {
        groups.set(key, { layout, items: [item] });
      }
    });

    return Array.from(groups.values());
  };

  const weekOptions = useMemo(
    () =>
      Array.from({ length: 9 }, (_, index) => {
        const start = addWeeks(startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }), index - 4);
        return {
          value: start.toISOString(),
          label: `${format(start, "d MMM")} - ${format(endOfWeek(start, { weekStartsOn: WEEK_STARTS_ON }), "d MMM yyyy")}`,
        };
      }),
    []
  );

  const openCreateAt = (date: Date, hour = 9) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    setCreateStart(start);
    setCreateOpen(true);
  };

  const handleMarkComplete = async (item: CalendarItem) => {
    if (item.type === "enquiry") return;
    try {
      await statusMutation.mutateAsync({
        type: item.type,
        sourceId: item.sourceId,
        status: "Completed",
      });
      toast.success("Task marked completed.");
      setSelectedItem((current) => current ? { ...current, status: "Completed" } : current);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update task.");
    }
  };

  const openFullTask = (item: CalendarItem) => {
    if (item.type === "task") {
      router.push(mode === "admin" ? `/admin/tasks/${item.sourceId}` : `/staff/tasks/${item.sourceId}`);
      return;
    }
    if (item.type === "enquiry") {
      router.push(mode === "admin" ? `/admin/enquiries/${item.sourceId}` : `/staff/enquiry/${item.sourceId}`);
    }
  };

  const pendingDateItems = pendingDate ? pendingForDate(pendingDate) : [];

  const renderEventBlock = (
    group: { layout: NonNullable<ReturnType<typeof getEventLayout>>; items: CalendarItem[] },
    day: Date
  ) => {
    const { layout, items: groupItems } = group;
    const item = groupItems[0];
    const top = ((layout.start.getHours() * 60 + layout.start.getMinutes()) / 60) * HOUR_HEIGHT;
    const height = Math.max(
      24,
      (Math.max(20, differenceInMinutes(layout.visualEnd, layout.start)) / 60) * HOUR_HEIGHT
    );
    const width = `calc(${layout.spanDays * 100}% - 0.5rem)`;

    return (
      <button
        key={`${item.id}-${format(day, "yyyy-MM-dd")}-${groupItems.length}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (groupItems.length > 1) {
            setSelectedGroupItems(groupItems);
          } else {
            setSelectedItem(item);
          }
        }}
        className={cn(
          "absolute left-1 z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] shadow-lg backdrop-blur transition hover:brightness-125",
          TYPE_STYLES[item.type]
        )}
        style={{ top, width, minHeight: height, maxHeight: height }}
      >
        <span className="flex items-center gap-1 font-semibold">
          <span className={cn("h-2 w-2 rounded-full", TYPE_DOT[item.type])} />
          {groupItems.length > 1 ? `${groupItems.length} tasks` : item.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] opacity-80">
          {format(layout.start, "h:mm a")}
          {groupItems.length > 1 ? " • Click to view all" : item.status ? ` • ${item.status}` : ""}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-[calc(100dvh-7rem)] rounded-3xl border border-slate-800/70 bg-slate-950/70 shadow-2xl">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* <Menu size={20} className="text-slate-500" />
          <div className="flex items-center gap-2 pr-2">
            <CalendarDays size={22} className="text-cyan-300" />
            <h1 className="text-lg font-semibold text-slate-100">Calendar</h1>
          </div> */}
          <Button
            size="sm"
            onClick={() => {
              const now = new Date();
              setWeekStart(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }));
              setSelectedDate(now);
            }}
            className="rounded-full border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full text-slate-300"
            onClick={() => setWeekStart((current) => subWeeks(current, 1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full text-slate-300"
            onClick={() => setWeekStart((current) => addWeeks(current, 1))}
          >
            <ChevronRight size={18} />
          </Button>
          <select
            value={weekOptions.some((option) => option.value === weekStart.toISOString()) ? weekStart.toISOString() : ""}
            onChange={(event) => {
              if (!event.target.value) return;
              setWeekStart(new Date(event.target.value));
            }}
            className="h-9 rounded-full border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none"
          >
            <option value="">
              {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM yyyy")}
            </option>
            {weekOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isFetching && <Badge className="bg-slate-800 text-slate-300">Refreshing</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task title"
              className="h-9 w-56 rounded-full border-slate-700 bg-slate-900 pl-9"
            />
          </div>
          <div className="flex rounded-full border border-slate-700 bg-slate-900 p-1">
            <Button
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "h-8 rounded-full px-3",
                viewMode === "calendar"
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  : "bg-transparent text-slate-300 hover:bg-slate-800"
              )}
            >
              Calendar
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMode("tasks")}
              className={cn(
                "h-8 rounded-full px-3",
                viewMode === "tasks"
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  : "bg-transparent text-slate-300 hover:bg-slate-800"
              )}
            >
              Task View
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[720px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800/80 bg-slate-950/80 p-4 lg:border-b-0 lg:border-r">
          <Button
            onClick={() => openCreateAt(selectedDate, Math.max(9, new Date().getHours()))}
            className="h-11 rounded-2xl border border-slate-700 bg-slate-900 px-5 text-slate-100 shadow-lg hover:bg-slate-800"
          >
            <Plus size={18} className="mr-2" />
            Create
          </Button>
          <div className="mt-5 max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/45 p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                setSelectedDate(date);
                setWeekStart(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }));
              }}
              month={selectedDate}
              onMonthChange={setSelectedDate}
              modifiers={{
                selectedWeek: weekDays,
              }}
              modifiersClassNames={{
                selectedWeek: "[&>button]:bg-cyan-500/10 [&>button]:text-cyan-100",
              }}
              className="mx-auto w-full max-w-[210px] p-1 text-slate-100 [--cell-size:1.65rem]"
              classNames={{
                root: "w-full max-w-[210px]",
                month: "w-full gap-2",
                months: "w-full",
                table: "w-full table-fixed border-collapse",
                weekdays: "grid grid-cols-7",
                weekday: "flex h-6 items-center justify-center text-[0.65rem]",
                week: "grid grid-cols-7",
                day: "h-[1.65rem] w-[1.65rem]",
                month_caption: "h-7 text-xs",
                nav: "top-0",
                button_previous: "h-7 w-7",
                button_next: "h-7 w-7",
              }}
            />
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <button
              type="button"
              onClick={() => setViewMode("tasks")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left",
                viewMode === "tasks" ? "bg-cyan-400/15 text-cyan-100" : "text-slate-300 hover:bg-slate-900"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarCheck2 size={16} /> All tasks
              </span>
              <span>{pendingItems.length}</span>
            </button>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Lists</p>
              <div className="mt-3 flex items-center justify-between text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-cyan-300" /> My Tasks
                </span>
                <span className="text-xs text-slate-500">{pendingItems.length}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-slate-950/40">
          {isLoading ? (
            <div className="flex h-full min-h-[620px] items-center justify-center">
              <LoaderSpin size={24} title="Loading calendar..." />
            </div>
          ) : viewMode === "calendar" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-b border-slate-800 bg-slate-950/70">
                  <div className="border-r border-slate-800 px-2 py-3 text-[11px] text-slate-500">GMT+04</div>
                  {weekDays.map((day) => {
                    const pendingCount = pendingForDate(day).length;
                    const dueItems = items.filter((item) => {
                      const end = parseItemDate(item.end);
                      return end && isSameDay(end, day) && isPendingItem(item);
                    });
                    return (
                      <div key={day.toISOString()} className="min-h-[96px] border-r border-slate-800 px-2 py-2">
                        <div className="text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {format(day, "EEE")}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(day);
                              openCreateAt(day, 9);
                            }}
                            className={cn(
                              "mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold",
                              isSameDay(day, new Date())
                                ? "bg-cyan-500 text-slate-950"
                                : "text-slate-100 hover:bg-slate-800"
                            )}
                          >
                            {format(day, "d")}
                          </button>
                        </div>
                        <div className="mt-2 space-y-1">
                          {pendingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setPendingDate(day)}
                              className="w-full truncate rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-left text-[11px] text-cyan-100"
                            >
                              {pendingCount} pending task{pendingCount > 1 ? "s" : ""}
                            </button>
                          )}
                          {dueItems.slice(0, 1).map((item) => (
                            <button
                              key={`due-${item.id}`}
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="w-full truncate rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-left text-[11px] text-rose-100"
                            >
                              Due: {item.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
                  <div className="border-r border-slate-800">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-slate-900 pr-2 text-right text-[11px] text-slate-500"
                        style={{ height: HOUR_HEIGHT }}
                      >
                        {hour === 0 ? "" : format(new Date(2026, 0, 1, hour), "h a")}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="relative border-r border-slate-800">
                      {HOURS.map((hour) => (
                        <button
                          key={`${day.toISOString()}-${hour}`}
                          type="button"
                          onClick={() => openCreateAt(day, hour)}
                          className="block w-full border-b border-slate-900 text-left transition hover:bg-cyan-400/5"
                          style={{ height: HOUR_HEIGHT }}
                          aria-label={`Create task on ${format(day, "EEEE")} at ${hour}:00`}
                        />
                      ))}
                      {eventGroupsForDay(day).map((group) => renderEventBlock(group, day))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl p-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">My Tasks</h2>
                    <p className="text-xs text-slate-500">
                      All pending tasks and enquiry actions
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openCreateAt(selectedDate, 9)}
                    className="text-cyan-200 hover:text-cyan-100"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add a task
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  {pendingItems.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                      No pending tasks or enquiry actions.
                    </p>
                  )}
                  {pendingItems.map((item) => {
                    const end = parseItemDate(item.end);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="flex w-full gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left transition hover:border-cyan-500/40"
                      >
                        <Circle size={15} className="mt-1 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-100">{item.title}</span>
                          {item.description && (
                            <span className="mt-1 block truncate text-xs text-slate-400">{item.description}</span>
                          )}
                          <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            {end && (
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">
                                Due {format(end, "EEE d MMM")}
                              </span>
                            )}
                            {item.status && (
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">
                                {item.status}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <CalendarTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={mode}
        canAssignStaff={canAssignStaff}
        staffOptions={staffOptions}
        isStaffLoading={isStaffLoading}
        defaultStart={createStart}
      />

      <Dialog open={Boolean(pendingDate)} onOpenChange={(open) => !open && setPendingDate(null)}>
        <DialogContent className="border border-slate-700 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pending tasks</DialogTitle>
            <p className="text-sm text-slate-400">
              {pendingDate ? format(pendingDate, "EEEE, d MMM yyyy") : ""}
            </p>
          </DialogHeader>
          <div className="space-y-3">
            {pendingDateItems.map((item) => (
              <button
                key={`pending-${item.id}`}
                type="button"
                onClick={() => {
                  setPendingDate(null);
                  setSelectedItem(item);
                }}
                className="flex w-full gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left hover:border-cyan-500/40"
              >
                <Circle size={15} className="mt-1 text-slate-400" />
                <span>
                  <span className="block text-sm font-semibold text-slate-100">{item.title}</span>
                  {item.description && <span className="block text-xs text-slate-400">{item.description}</span>}
                  <span className="mt-2 block text-[11px] text-slate-500">{formatItemWindow(item)}</span>
                </span>
              </button>
            ))}
            {pendingDateItems.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingDate(null);
                  setViewMode("tasks");
                }}
                className="ml-auto flex text-cyan-200"
              >
                Open Tasks
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedGroupItems.length > 0}
        onOpenChange={(open) => !open && setSelectedGroupItems([])}
      >
        <DialogContent className="border border-slate-700 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedGroupItems.length} tasks</DialogTitle>
            <p className="text-sm text-slate-400">
              Multiple tasks are scheduled in this calendar slot.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            {selectedGroupItems.map((item) => (
              <button
                key={`group-${item.id}`}
                type="button"
                onClick={() => {
                  setSelectedGroupItems([]);
                  setSelectedItem(item);
                }}
                className={cn(
                  "flex w-full gap-3 rounded-xl border p-3 text-left transition hover:brightness-125",
                  TYPE_STYLES[item.type]
                )}
              >
                <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", TYPE_DOT[item.type])} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  {item.description && (
                    <span className="mt-1 block truncate text-xs opacity-80">{item.description}</span>
                  )}
                  <span className="mt-2 block text-[11px] opacity-70">{formatItemWindow(item)}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="border border-slate-700 bg-slate-950 text-slate-100 sm:max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className={cn("mt-1.5 h-3 w-3 rounded-sm", TYPE_DOT[selectedItem.type])} />
                    <div>
                      <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                      <p className="mt-1 text-sm text-slate-400">{formatItemWindow(selectedItem)}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedItem(null)}
                    className="h-8 w-8 text-slate-400"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {selectedItem.status && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <ListChecks size={16} className="text-slate-500" />
                    {selectedItem.status}
                  </div>
                )}
                {selectedItem.description && (
                  <div className="flex items-start gap-3 text-slate-300">
                    <CalendarCheck2 size={16} className="mt-0.5 text-slate-500" />
                    <p>{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.assignedLabel && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <UsersRound size={16} className="text-slate-500" />
                    {selectedItem.assignedLabel}
                  </div>
                )}
                {selectedItem.createdBy && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <UserRound size={16} className="text-slate-500" />
                    Created by {selectedItem.createdBy}
                  </div>
                )}
                {selectedItem.action && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Clock3 size={16} className="text-slate-500" />
                    Enquiry action: {selectedItem.action}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                {selectedItem.type !== "custom" && (
                  <Button
                    variant="ghost"
                    onClick={() => openFullTask(selectedItem)}
                    className="text-cyan-200 hover:text-cyan-100"
                  >
                    Open {selectedItem.type === "enquiry" ? "Enquiry" : "Task"}
                  </Button>
                )}
                {isPendingItem(selectedItem) && selectedItem.type !== "enquiry" && (
                  <Button
                    onClick={() => handleMarkComplete(selectedItem)}
                    disabled={statusMutation.isPending}
                    className="rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  >
                    {statusMutation.isPending ? "Updating..." : "Mark completed"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarWorkspace;
