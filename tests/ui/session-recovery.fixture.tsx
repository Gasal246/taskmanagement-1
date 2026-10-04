import React, { useEffect, useState } from "react";
import { SessionContext, useSession, type SessionContextValue } from "next-auth/react";
import SessionRecovery from "@/components/shared/SessionRecovery";

const verified = { user: { id: "recovery-user" }, expires: "2099-01-01T00:00:00Z" };
function Observer() {
  const { status } = useSession();
  return <p id="recovery-status">{status}</p>;
}
export default function SessionRecoveryFixture() {
  const [session, setSession] = useState<typeof verified | null>(verified);
  useEffect(() => {
    const original = window.fetch;
    (window as any).sessionResponse = "busy";
    (window as any).sessionProbeRequests = [];
    window.fetch = async (...args) => {
      if (args[0] !== "/api/auth/session") return original(...args);
      const mode = (window as any).sessionResponse;
      (window as any).sessionProbeRequests.push(mode);
      if (mode === "network") throw new Error("Network unavailable");
      return new Response(JSON.stringify(mode === "valid" ? verified : null), { status: mode === "busy" ? 503 : 200 });
    };
    return () => { window.fetch = original; };
  }, []);
  const update = React.useCallback(async () => {
    if ((window as any).sessionResponse !== "valid") return null;
    setSession(verified);
    return verified;
  }, []);
  const context: SessionContextValue = session ? { data: session, status: "authenticated", update } : { data: null, status: "unauthenticated", update };
  return <SessionContext.Provider value={context}>
    <button id="lose-session" onClick={() => setSession(null)}>Simulate failed refresh</button>
    <SessionRecovery><Observer /></SessionRecovery>
  </SessionContext.Provider>;
}
