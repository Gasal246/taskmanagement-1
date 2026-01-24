"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  onForegroundMessage,
  requestFcmToken,
} from "@/firebase/messaging";

const tokenStorageKey = "fcm-token";

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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    onForegroundMessage((payload) => {
      const { title, body } = formatNotification(payload);
      toast(title, { description: body || undefined });
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
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const setup = async () => {
      if (Notification.permission === "denied") return;
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }

      const token = await requestFcmToken();
      if (!token) return;

      const storedToken = window.localStorage.getItem(tokenStorageKey);
      if (storedToken === token) return;

      const response = await fetch("/api/notifications/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        window.localStorage.setItem(tokenStorageKey, token);
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
    };

    setup().catch((error) => {
      console.error("Failed to initialize FCM", error);
    });
  }, [session?.user?.id]);

  return null;
};

export default FcmNotifications;
