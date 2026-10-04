"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const Notifications = dynamic(() => import("./FcmNotifications"), { ssr: false });

export default function DeferredNotifications() {
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => setReady(true), { timeout: 2_000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(handle);
  }, [session?.user?.id, status]);
  return ready && status === "authenticated" && session?.user?.id ? <Notifications /> : null;
}
