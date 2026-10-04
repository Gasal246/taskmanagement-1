"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar } from "antd";
import { cn, multiFormatDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { setUnreadCount } from "@/redux/slices/notifications";
import { updateNotification } from "@/lib/notifications/client";
import NotificationSettings from "./NotificationSettings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type NotificationItem = {
  id: string;
  kind?: string;
  title: string;
  body: string;
  data: Record<string, any>;
  meta?: Record<string, any>;
  createdAt: string;
  readAt: string | null;
  actionRequired: boolean;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  } | null;
};

const NotificationCard = ({
  notification,
  onOpenLink,
}: {
  notification: NotificationItem;
  onOpenLink: (notification: NotificationItem) => void;
}) => {
  const isUnread = !notification.readAt;
  const isTask =
    notification.kind === "task" ||
    notification.data?.type === "task" ||
    notification.meta?.taskId;
  const isActivity =
    notification.kind === "task-activity" ||
    notification.kind === "task-activity-comment" ||
    notification.data?.type === "task-activity-comment" ||
    notification.data?.type === "task-activity";
  const isEnquiry =
    notification.kind === "enquiry" ||
    notification.data?.type === "enquiry";
  const taskNameRaw =
    notification.meta?.taskName ||
    notification.data?.taskName ||
    notification.body ||
    "";
  const taskDescriptionRaw =
    notification.meta?.taskDescription ||
    notification.data?.taskDescription ||
    "";
  const byLineRaw = notification.meta?.byLine || notification.data?.byLine || "";
  const truncateText = (value: string, maxLength: number) => {
    const text = value?.trim() || "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };
  const taskNameText = truncateText(taskNameRaw, 56);
  const taskDescriptionText = truncateText(taskDescriptionRaw, 120);
  const activityTitleRaw =
    notification.meta?.activityTitle || notification.data?.activityTitle || "";
  const activityTitleText = truncateText(activityTitleRaw, 64);
  const activityTaskNameRaw =
    notification.meta?.taskName || notification.data?.taskName || "";
  const activityTaskNameText = truncateText(activityTaskNameRaw, 64);
  const taskTypeRaw =
    notification.meta?.taskType || notification.data?.taskType || "";
  const actorName =
    notification.meta?.actorName || notification.data?.actorName || "";
  const actorByLine = notification.meta?.byLine || notification.data?.byLine || "";
  const enquiryPriority =
    notification.meta?.priority || notification.data?.priority || "";
  const enquiryAction =
    notification.meta?.action || notification.data?.action || "";
  const enquiryUuid =
    notification.meta?.enquiryUuid || notification.data?.enquiryUuid || "";
  return (
    <button
      type="button"
      onClick={() => onOpenLink(notification)}
      aria-label={`${isUnread ? "Unread" : "Read"}: ${notification.title}`}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition",
        isUnread
          ? "border-primary/40 bg-slate-900/70 hover:bg-slate-900"
          : "border-slate-800 bg-slate-950 hover:bg-slate-900/70"
      )}
    >
      {isEnquiry ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-sky-200/80">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5">
              Enquiry
            </span>
            <span className="text-[11px] text-slate-400 normal-case tracking-normal">
              {multiFormatDateString(notification.createdAt)}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">
              {notification.title}
            </h3>
            {enquiryUuid && (
              <p className="text-xs text-slate-400">UUID: {enquiryUuid}</p>
            )}
            {enquiryPriority && (
              <span className="inline-flex w-fit items-center rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-300">
                Priority: {enquiryPriority}
              </span>
            )}
            {enquiryAction && (
              <p className="text-xs text-slate-400">Action: {enquiryAction}</p>
            )}
          </div>
          {(actorName || actorByLine) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {actorName && <span>By {actorName}</span>}
              {actorByLine && <span>{actorByLine}</span>}
            </div>
          )}
        </div>
      ) : isActivity ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-amber-200/80">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5">
              Activity
            </span>
            <span className="text-[11px] text-slate-400 normal-case tracking-normal">
              {multiFormatDateString(notification.createdAt)}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">
              {notification.title}
            </h3>
            {activityTitleText && (
              <p className="text-sm font-semibold text-amber-200">
                {activityTitleText}
              </p>
            )}
            {activityTaskNameText && (
              <p className="text-xs text-slate-400">
                Task: {activityTaskNameText}
              </p>
            )}
            {taskTypeRaw && (
              <span className="inline-flex w-fit items-center rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-300">
                {taskTypeRaw}
              </span>
            )}
          </div>
          {(actorName || actorByLine) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {actorName && <span>By {actorName}</span>}
              {actorByLine && <span>{actorByLine}</span>}
            </div>
          )}
        </div>
      ) : isTask ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-emerald-200/80">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">
              Task
            </span>
            <span className="text-[11px] text-slate-400 normal-case tracking-normal">
              {multiFormatDateString(notification.createdAt)}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">
              {notification.title}
            </h3>
            <p className="text-sm font-semibold text-emerald-200">
              {taskNameText}
            </p>
            {taskDescriptionText && (
              <p className="text-xs text-slate-300">{taskDescriptionText}</p>
            )}
          </div>
          {(byLineRaw || notification.sender) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {byLineRaw && <span>By {byLineRaw}</span>}
              {notification.sender && (
                <span className="flex items-center gap-1.5">
                  <Avatar
                    src={notification.sender.avatar_url || "/avatar.png"}
                    size={18}
                  />
                  {notification.sender.name || notification.sender.email}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  isUnread ? "bg-emerald-400" : "bg-slate-700"
                )}
              />
              <h3 className="text-sm font-semibold text-slate-100">
                {notification.title}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {multiFormatDateString(notification.createdAt)}
            </span>
          </div>
          {notification.body && (
            <p className="text-xs text-slate-300">{notification.body}</p>
          )}
          {notification.sender && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Avatar
                src={notification.sender.avatar_url || "/avatar.png"}
                size={20}
              />
              <span>{notification.sender.name || notification.sender.email}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
};

const NotificationPane = ({ trigger }: { trigger: React.ReactNode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: session } = useSession();
  const [filter, setFilter] = useState("unread");
  const [category, setCategory] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState("");
  const router = useRouter();
  const pendingRequest = useRef<AbortController | null>(null);
  const [mutating, setMutating] = useState(false);
  const descriptionText = `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;
  const fetchNotifications = useCallback(async (cursor?: string) => {
    pendingRequest.current?.abort();
    const controller = new AbortController(); pendingRequest.current = controller;
    setLoading(true); setErrorMessage("");
    try {
      const params = new URLSearchParams({ limit: "30", filter, category }); if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/notifications?${params}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load notifications");
      const data = await response.json();
      if (controller.signal.aborted) return;
      setNotifications(previous => cursor ? [...previous, ...data.notifications.filter((item: NotificationItem) => !previous.some(old => old.id === item.id))] : data.notifications);
      setNextCursor(data.nextCursor); if (!cursor) setSnapshotAt(data.snapshotAt);
      dispatch(setUnreadCount(data.unreadCount));
    } catch (error: any) { if (!controller.signal.aborted) setErrorMessage(error.message); } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [filter, category, dispatch]);
  useEffect(() => { setNotifications([]); setSnapshotAt(""); setNextCursor(null); if (open && session?.user?.id) void fetchNotifications(); return () => pendingRequest.current?.abort(); }, [open, fetchNotifications, session?.user?.id]);
  useEffect(() => {
    if (!open) return;
    const refresh = () => { if (document.visibilityState === "visible") void fetchNotifications(); };
    const storage = (event: StorageEvent) => { if (event.key === "notifications-updated") refresh(); };
    window.addEventListener("notifications-refreshed", refresh); window.addEventListener("notifications-changed", refresh); window.addEventListener("storage", storage);
    window.addEventListener("online", refresh); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("notifications-refreshed", refresh); window.removeEventListener("notifications-changed", refresh); window.removeEventListener("storage", storage); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); };
  }, [open, fetchNotifications]);
  const changeState = async (body: Record<string, unknown>) => {
    setMutating(true);
    try { const data = await updateNotification(body); dispatch(setUnreadCount(data.unreadCount)); await fetchNotifications(); }
    catch (error: any) { toast.error(error.message); } finally { setMutating(false); }
  };
  const markAllRead = () => changeState({ all: true, before: snapshotAt, operation: "read" });
  const handleOpenLink = (notification: NotificationItem) => {
    setOpen(false);
    router.push(`/notifications/${notification.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex w-full max-w-[560px] flex-col border border-slate-800/70 bg-slate-950/95">
        <SheetHeader className="gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription className="text-sm text-slate-400">
                {descriptionText}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" disabled={mutating || !snapshotAt} onClick={() => void markAllRead()}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4 pr-2">
          <div className="flex gap-2"><select aria-label="Notification filter" className="rounded border border-slate-700 bg-slate-900 p-2 text-sm" value={filter} onChange={event => setFilter(event.target.value)}><option value="unread">Unread</option><option value="all">All notifications</option></select><select aria-label="Notification category" className="min-w-0 rounded border border-slate-700 bg-slate-900 p-2 text-sm" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option><option value="task">Tasks & activities</option><option value="enquiry">Enquiries & approvals</option><option value="project">Projects</option><option value="calendar">Calendar</option></select></div>
          <NotificationSettings />

          {loading && notifications.length === 0 && (
            <div className="space-y-3 text-sm text-slate-500">
              <div className="h-16 rounded-2xl bg-slate-900/70 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-900/70 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-900/70 animate-pulse" />
            </div>
          )}
          {!loading && errorMessage && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              {errorMessage}
            </div>
          )}
          {!loading && !errorMessage && notifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 text-center text-sm text-slate-500">
              No notifications yet. You will see updates here as they arrive.
            </div>
          )}
          {notifications.map((notification) => (
              <div key={notification.id} className="space-y-1"><NotificationCard
                key={notification.id}
                notification={notification}
                onOpenLink={handleOpenLink}
              /><div className="flex flex-wrap gap-3 px-3 text-xs text-slate-400"><button disabled={mutating} onClick={() => changeState({ ids: [notification.id], operation: notification.readAt ? "unread" : "read" })}>{notification.readAt ? "Mark unread" : "Mark read"}</button><button disabled={mutating} onClick={() => changeState({ ids: [notification.id], operation: "archive" })}>Archive</button>{notification.actionRequired && !notification.readAt && <button disabled={mutating} onClick={() => changeState({ ids: [notification.id], operation: "snooze", hours: 24 })}>Snooze reminders for 24h</button>}</div></div>
            ))}
          {nextCursor && <Button variant="outline" disabled={loading} onClick={() => fetchNotifications(nextCursor)}>Load more</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationPane;
