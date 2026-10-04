"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { setUnreadCount } from "@/redux/slices/notifications";
import { onForegroundMessage } from "@/firebase/messaging";
import { registerNotificationDevice, setNotificationAccount } from "@/lib/notifications/device";
import { announceNotificationChange } from "@/lib/notifications/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function FcmNotifications() {
  const { data: session } = useSession(); const userId = session?.user?.id; const dispatch = useDispatch();
  const [prompt, setPrompt] = useState(false); const seen = useRef(new Set<string>());
  const count = useQuery({ queryKey: ["notification-count", userId], enabled: Boolean(userId), refetchInterval: 30_000, refetchIntervalInBackground: false, refetchOnWindowFocus: true, refetchOnReconnect: true,
    queryFn: async () => { const response = await fetch("/api/notifications/unread-count", { cache: "no-store" }); if (!response.ok) throw new Error("Unable to refresh notification count"); return response.json(); } });
  const refetchCount = count.refetch;
  useEffect(() => {
    const refresh = () => { if (userId) void refetchCount(); };
    const storage = (event: StorageEvent) => { if (event.key === "notifications-updated") refresh(); };
    window.addEventListener("notifications-changed", refresh); window.addEventListener("storage", storage);
    return () => { window.removeEventListener("notifications-changed", refresh); window.removeEventListener("storage", storage); };
  }, [userId, refetchCount]);
  useEffect(() => {
    const value = userId ? count.data?.unreadCount : 0;
    if (typeof value !== "number") return;
    dispatch(setUnreadCount(value));
    const nav = navigator as Navigator & { setAppBadge?: (value: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (value ? nav.setAppBadge?.(value) : nav.clearAppBadge?.())?.catch(() => {});
    if ("caches" in window) void caches.open("taskmanager-meta-v1").then(cache => cache.put("/__badge_count__", new Response(JSON.stringify({ count: value })))).catch(() => {});
    window.dispatchEvent(new Event("notifications-refreshed"));
  }, [count.data?.unreadCount, userId, dispatch]);
  useEffect(() => {
    dispatch(setUnreadCount(0)); seen.current.clear();
    if (userId) setNotificationAccount(userId);
    if (!userId || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    const check = () => {
      if (Notification.permission === "granted") { setPrompt(false); void registerNotificationDevice().catch(() => {}); }
      else setPrompt(Notification.permission === "default" && Date.now() > Number(localStorage.getItem("notification-prompt-until") || 0));
    };
    check(); window.addEventListener("focus", check); window.addEventListener("online", check);
    return () => { window.removeEventListener("focus", check); window.removeEventListener("online", check); };
  }, [userId, dispatch]);
  useEffect(() => {
    if (!userId) return;
    let active = true; let unsubscribe: (() => void) | undefined;
    const receive = (payload: any) => {
      if (!active || (payload.data?.recipientId && payload.data.recipientId !== userId)) return;
      const id = payload.data?.deliveryId || payload.data?.notificationId || payload.messageId;
      if (id && seen.current.has(id)) return;
      if (id) { seen.current.add(id); if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value!); }
      announceNotificationChange();
      if (document.visibilityState === "visible") toast(payload.data?.title || payload.notification?.title || "New notification", { description: payload.data?.body || payload.notification?.body,
        action: payload.data?.notificationId ? { label: "Open", onClick: () => { window.location.href = `/notifications/${payload.data.notificationId}`; } } : undefined });
    };
    if ("Notification" in window && "serviceWorker" in navigator) void onForegroundMessage(receive).then(fn => { if (active) unsubscribe = fn; else fn(); }).catch(() => {});
    const workerMessage = (event: MessageEvent) => { if (event.data?.type === "fcm-background-message") receive(event.data.payload); };
    navigator.serviceWorker?.addEventListener("message", workerMessage);
    return () => { active = false; unsubscribe?.(); navigator.serviceWorker?.removeEventListener("message", workerMessage); };
  }, [userId]);
  if (!userId || !prompt) return null;
  return <aside className="fixed bottom-4 right-4 z-50 max-w-sm space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-xl" aria-label="Enable notifications"><p className="text-sm">Enable device notifications for updates when you are away. Your in-app inbox works either way.</p><div className="flex gap-2"><Button size="sm" onClick={async () => { const result = await Notification.requestPermission(); setPrompt(false); if (result === "granted") void registerNotificationDevice(true).catch(() => toast.error("Setup incomplete. Reconnect in notification settings.")); }}>Enable notifications</Button><Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("notification-prompt-until", String(Date.now() + 7 * 86400_000)); setPrompt(false); }}>Not now</Button></div></aside>;
}
