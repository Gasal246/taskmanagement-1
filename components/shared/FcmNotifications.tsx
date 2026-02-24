"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  onForegroundMessage,
  requestFcmToken,
} from "@/firebase/messaging";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/store";
import {
  incrementUnreadCount,
  setUnreadCount,
} from "@/redux/slices/notifications";
import { Button } from "@/components/ui/button";

const tokenStorageKey = "fcm-token";
const notificationPromptKey = "notification-permission-dismissed-until";

function formatNotification(payload: {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}) {
  const title =
    payload.notification?.title || payload.data?.title || "New notification";
  const body = payload.notification?.body || payload.data?.body || "";
  return { title, body };
}

const FcmNotifications = () => {
  const { data: session } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    "default"
  );

  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data?.unreadCount === "number") {
        dispatch(setUnreadCount(data.unreadCount));
      }
    } catch (error) {
      console.error("Failed to refresh unread notification count", error);
    }
  }, [dispatch]);

  const storeToken = useCallback(async () => {
    if (typeof window === "undefined") return;
    const storageKey = userId ? `${tokenStorageKey}:${userId}` : tokenStorageKey;
    const token = await requestFcmToken();
    if (!token) return;

    const storedToken = window.localStorage.getItem(storageKey);
    if (storedToken === token) return;

    const response = await fetch("/api/notifications/fcm-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: navigator.platform || null,
        device: navigator.userAgent || null,
      }),
    });

    if (response.ok) {
      window.localStorage.setItem(storageKey, token);
      return;
    }

    let message = "Failed to store FCM token.";
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch (error) {
      console.error("Failed to parse FCM token response", error);
    }
    console.error(message);
  }, [userId]);

  const handleRequestPermission = async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === "granted") {
        setShowPermissionPrompt(false);
        await storeToken();
      }
    } catch (error) {
      console.error("Failed to request notification permission", error);
    }
  };

  const handleDismissPrompt = () => {
    if (typeof window === "undefined") return;
    const nextDismissUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    window.localStorage.setItem(
      notificationPromptKey,
      nextDismissUntil.toISOString()
    );
    setShowPermissionPrompt(false);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    onForegroundMessage((payload) => {
      const { title, body } = formatNotification(payload);
      toast(title, { description: body || undefined });
      dispatch(incrementUnreadCount(1));
    }).then((unsub) => {
      if (!active) {
        unsub();
        return;
      }
      unsubscribe = unsub;
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const permission = Notification.permission;
    setPermissionState(permission);

    const dismissedUntil = window.localStorage.getItem(notificationPromptKey);
    const dismissedUntilDate = dismissedUntil ? new Date(dismissedUntil) : null;
    const isDismissed =
      dismissedUntilDate && dismissedUntilDate.getTime() > Date.now();

    if (permission !== "granted" && !isDismissed) {
      setShowPermissionPrompt(true);
    }

    if (permission === "granted") {
      storeToken().catch((error) => {
        console.error("Failed to initialize FCM", error);
      });
    }
  }, [userId, storeToken]);

  useEffect(() => {
    if (!userId) return;
    refreshUnreadCount();
    const handleFocus = () => refreshUnreadCount();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshUnreadCount, userId]);

  if (!userId || !showPermissionPrompt) {
    return null;
  }

  const blocked = permissionState === "denied";

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/95 p-6 shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">
              Enable notifications
            </h2>
            <p className="text-sm text-slate-400">
              {blocked
                ? "Notifications are blocked in your browser settings. Enable them to receive updates even when you are away."
                : "Stay updated even when this tab is closed. Allow notifications to receive task updates and alerts."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDismissPrompt}
            >
              Not now
            </Button>
            <Button
              type="button"
              onClick={handleRequestPermission}
              disabled={blocked}
            >
              {blocked ? "Blocked in browser" : "Allow notifications"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FcmNotifications;
