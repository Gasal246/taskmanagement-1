"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

const UserActivityTracker = () => {
  const { data: session, status } = useSession();
  const lastUserId = useRef<string | null>(null);
  const logoutSent = useRef(false);
  const isSuper = Boolean((session?.user as any)?.is_super);

  const sendActivity = useCallback((action: "login" | "logout", useBeacon = false) => {
    if (!session?.user?.id || isSuper) return;

    const payload = JSON.stringify({ action });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/users/activity", blob);
      return;
    }

    fetch("/api/users/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "include",
    }).catch(() => {});
  }, [isSuper, session?.user?.id]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || isSuper) return;

    if (lastUserId.current !== session.user.id) {
      lastUserId.current = session.user.id;
      logoutSent.current = false;
      sendActivity("login");
    }
  }, [isSuper, sendActivity, status, session?.user?.id]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || isSuper) return;

    const handleLogout = () => {
      if (logoutSent.current) return;
      sendActivity("logout", true);
      logoutSent.current = true;
    };

    window.addEventListener("beforeunload", handleLogout);
    window.addEventListener("pagehide", handleLogout);

    return () => {
      window.removeEventListener("beforeunload", handleLogout);
      window.removeEventListener("pagehide", handleLogout);
    };
  }, [isSuper, sendActivity, status, session?.user?.id]);

  useEffect(() => {
    if (status === "unauthenticated" && lastUserId.current && !logoutSent.current) {
      sendActivity("logout");
      logoutSent.current = true;
    }
  }, [sendActivity, status]);

  return null;
};

export default UserActivityTracker;
