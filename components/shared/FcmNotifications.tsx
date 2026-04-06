"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  onForegroundMessage,
  requestFcmToken,
} from "@/firebase/messaging";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  setUnreadCount,
} from "@/redux/slices/notifications";
import { Button } from "@/components/ui/button";

const tokenStorageKey = "fcm-token";
const notificationPromptKey = "notification-permission-dismissed-until";
const badgeCacheName = "taskmanager-meta-v1";
const badgeCountCacheKey = "/__badge_count__";

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

async function persistBadgeCount(count: number) {
  if (typeof window === "undefined") return;
  if (!("caches" in window)) return;

  const cache = await window.caches.open(badgeCacheName);
  await cache.put(
    badgeCountCacheKey,
    new Response(JSON.stringify({ count: Math.max(0, count) }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
}

async function syncAppBadge(count: number) {
  if (typeof window === "undefined") return;

  await persistBadgeCount(count);

  const badgeNavigator = navigator as BadgeNavigator;
  if (count > 0 && typeof badgeNavigator.setAppBadge === "function") {
    await badgeNavigator.setAppBadge(count);
    return;
  }

  if (typeof badgeNavigator.clearAppBadge === "function") {
    await badgeNavigator.clearAppBadge();
  }
}

function getTokenStorageKeys(userId?: string | null) {
  return userId
    ? [`${tokenStorageKey}:${userId}`, tokenStorageKey]
    : [tokenStorageKey];
}

function getStoredToken(userId?: string | null) {
  if (typeof window === "undefined") return null;

  const keys = getTokenStorageKeys(userId);
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

function setStoredToken(userId: string | null | undefined, token: string) {
  if (typeof window === "undefined") return;

  const keys = getTokenStorageKeys(userId);
  keys.forEach((key) => {
    window.localStorage.setItem(key, token);
  });
}

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
  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );
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
    if (typeof window === "undefined") return false;
    const token = await requestFcmToken();
    if (!token) return false;

    const storedToken = getStoredToken(userId);
    if (storedToken === token) return true;

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
      setStoredToken(userId, token);
      return true;
    }

    let message = "Failed to store FCM token.";
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch (error) {
      console.error("Failed to parse FCM token response", error);
    }
    console.error(message);
    return false;
  }, [userId]);

  const ensureClientToken = useCallback(
    async (permission: NotificationPermission) => {
      if (typeof window === "undefined") return;

      const storedToken = getStoredToken(userId);
      if (storedToken) {
        if (permission !== "denied") {
          setShowPermissionPrompt(false);
        }
        return;
      }

      if (permission === "granted") {
        const stored = await storeToken();
        if (stored) {
          setShowPermissionPrompt(false);
        }
        return;
      }

      // Browsers do not allow silent token creation without notification permission.
      // If the local token cache is missing, surface the prompt again for this client.
      window.localStorage.removeItem(notificationPromptKey);
      setShowPermissionPrompt(true);
    },
    [storeToken, userId]
  );

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
      refreshUnreadCount();
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
  }, [dispatch, refreshUnreadCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "fcm-background-message") return;

      const payload = event.data?.payload || {};
      const { title, body } = formatNotification(payload);

      refreshUnreadCount();

      if (document.visibilityState === "visible") {
        toast(title, { description: body || undefined });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, [refreshUnreadCount]);

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

    ensureClientToken(permission).catch((error) => {
      console.error("Failed to initialize FCM", error);
    });
  }, [ensureClientToken, userId]);

  useEffect(() => {
    if (!userId) return;
    refreshUnreadCount();
    const handleFocus = () => {
      refreshUnreadCount();
      if (typeof window === "undefined" || !("Notification" in window)) return;
      ensureClientToken(Notification.permission).catch((error) => {
        console.error("Failed to re-check FCM token", error);
      });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [ensureClientToken, refreshUnreadCount, userId]);

  useEffect(() => {
    if (!userId) return;
    syncAppBadge(unreadCount).catch((error) => {
      console.error("Failed to sync app badge", error);
    });
  }, [unreadCount, userId]);

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
