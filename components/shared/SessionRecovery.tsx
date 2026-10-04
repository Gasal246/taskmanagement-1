"use client";

import { SessionContext, useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Auth.js treats failed session refreshes as null. Confirm a real logout before
// consumers clear role/domain state; a 503 must remain a loading/retry state.
export default function SessionRecovery({ children }: { children: ReactNode }) {
  const session = useSession();
  const previouslyVerified = useRef(session.status === "authenticated");
  const [confirmedLogout, setConfirmedLogout] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const recovering = session.status === "unauthenticated" && previouslyVerified.current && !confirmedLogout;

  useEffect(() => {
    if (session.status === "authenticated") {
      previouslyVerified.current = true;
      setConfirmedLogout(false);
      setUnavailable(false);
      setAttempt(0);
      return;
    }
    if (!recovering) return;
    const controller = new AbortController();
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout>;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const confirm = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Session verification unavailable");
        const verified = await response.json();
        if (!active) return;
        if (!verified?.user?.id) {
          previouslyVerified.current = false;
          setConfirmedLogout(true);
          setUnavailable(false);
          return;
        }
        // Restore the upstream provider too, so sign-out and cross-tab updates
        // keep their normal semantics. Nothing here authorizes server requests.
        if (!await session.update()) throw new Error("Session refresh unavailable");
      } catch {
        if (!active) return;
        setUnavailable(true);
        retryTimer = setTimeout(() => setAttempt(value => value + 1), Math.min(30_000, 5000 * 2 ** Math.min(attempt, 3)));
      } finally { clearTimeout(timeout); }
    };
    void confirm();
    return () => { active = false; controller.abort(); clearTimeout(timeout); clearTimeout(retryTimer); };
  }, [session.status, session.update, recovering, attempt]);

  return <SessionContext.Provider value={recovering ? { data: null, status: "loading", update: session.update } : session}>
    {recovering && <div role={unavailable ? "alert" : "status"} className="border-b border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-100">
      {unavailable ? "Session verification is temporarily unavailable. Your sign-in has been preserved." : "Checking your session…"}
      {unavailable && <button type="button" className="ml-3 rounded border border-amber-500 px-3 py-1" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
    </div>}
    {children}
  </SessionContext.Provider>;
}
