"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import Cookies from "js-cookie";

type NotificationItem = {
  id: string;
  kind?: string;
  title: string;
  body: string;
  data: Record<string, any>;
  meta?: Record<string, any>;
  createdAt: string;
  readAt: string | null;
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

  const descriptionText = useMemo(() => {
    if (unreadCount > 0) {
      return `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`;
    }
    if (notifications.length > 0) {
      return "You're all caught up.";
    }
    return "You have no notifications yet.";
  }, [notifications.length, unreadCount]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/notifications?limit=40");
      if (!response.ok) {
        setErrorMessage("Unable to load notifications.");
        return null;
      }
      const data = await response.json();
      const items = Array.isArray(data?.notifications) ? data.notifications : [];
      setNotifications(items);
      if (typeof data?.unreadCount === "number") {
        dispatch(setUnreadCount(data.unreadCount));
        return data.unreadCount as number;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setErrorMessage("Unable to load notifications.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const markAllRead = useCallback(async (countOverride?: number) => {
    if ((countOverride ?? unreadCount) <= 0) return;
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data?.unreadCount === "number") {
        dispatch(setUnreadCount(data.unreadCount));
      } else {
        dispatch(setUnreadCount(0));
      }
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  }, [dispatch, unreadCount]);

  useEffect(() => {
    if (!open) return;
    fetchNotifications().then((freshUnread) => {
      const countToUse = freshUnread ?? unreadCount;
      if (countToUse > 0) {
        markAllRead(countToUse);
      }
    });
  }, [open, fetchNotifications, markAllRead, unreadCount]);

  const handleOpenLink = (notification: NotificationItem) => {
    const resolveTaskLink = (taskId: string) => {
      const roleCookie = Cookies.get("user_role");
      if (!roleCookie) return `/staff/tasks/${taskId}`;
      try {
        const parsedRole = JSON.parse(roleCookie);
        const roleName = parsedRole?.role_name || parsedRole?.role || "";
        if (
          roleName === "BUSINESS_ADMIN" ||
          roleName === "SUPER_ADMIN" ||
          roleName.toUpperCase().includes("ADMIN")
        ) {
          return `/admin/tasks/${taskId}`;
        }
      } catch (error) {
        return `/staff/tasks/${taskId}`;
      }
      return `/staff/tasks/${taskId}`;
    };
    const resolveEnquiryLink = (enquiryId: string) => {
      const roleCookie = Cookies.get("user_role");
      if (!roleCookie) return `/staff/enquiry/${enquiryId}`;
      try {
        const parsedRole = JSON.parse(roleCookie);
        const roleName = parsedRole?.role_name || parsedRole?.role || "";
        if (
          roleName === "BUSINESS_ADMIN" ||
          roleName === "SUPER_ADMIN" ||
          roleName.toUpperCase().includes("ADMIN")
        ) {
          return `/admin/enquiries/${enquiryId}`;
        }
      } catch (error) {
        return `/staff/enquiry/${enquiryId}`;
      }
      return `/staff/enquiry/${enquiryId}`;
    };

    const taskId = notification.data?.taskId || notification.meta?.taskId || "";
    const enquiryId =
      notification.data?.enquiryId || notification.meta?.enquiryId || "";
    const link =
      notification.data?.link ||
      notification.data?.url ||
      (taskId
        ? resolveTaskLink(taskId)
        : enquiryId
        ? resolveEnquiryLink(enquiryId)
        : "");
    if (!link) return;
    if (link.startsWith("/")) {
      window.location.href = link;
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[560px] border border-slate-800/70 bg-slate-950/95">
        <SheetHeader className="gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription className="text-sm text-slate-400">
                {descriptionText}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex h-full flex-col gap-3 overflow-y-auto py-4 pr-2">
          {loading && (
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
          {!loading &&
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onOpenLink={handleOpenLink}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationPane;
