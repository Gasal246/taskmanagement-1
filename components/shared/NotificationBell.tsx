"use client";
import { Bell } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import NotificationPane from "./NotificationPane";
export default function NotificationBell() {
  const unread = useSelector((state: RootState) => state.notifications.unreadCount);
  return <NotificationPane trigger={<button type="button" aria-label={`Notifications, ${unread} unread`} className="relative rounded-xl p-2 text-primary transition-colors hover:bg-slate-800/60"><Bell size={20} />{unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}</button>} />;
}
