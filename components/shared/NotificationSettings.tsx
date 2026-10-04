"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerNotificationDevice } from "@/lib/notifications/device";
export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState("unsupported");
  const [deviceReady, setDeviceReady] = useState(false);
  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    fetch("/api/notifications/preferences").then(async response => { if (response.ok) setPreferences(await response.json()); }).catch(() => {});
    const refresh = () => setDeviceReady(window.sessionStorage.getItem("notification-device-ready") === "1"); refresh();
    window.addEventListener("notification-device-status", refresh); return () => window.removeEventListener("notification-device-status", refresh);
  }, []);
  const enable = async () => {
    setBusy(true);
    try { const result = await Notification.requestPermission(); setPermission(result); if (result === "granted") { await registerNotificationDevice(true); setDeviceReady(true); toast.success("Notifications enabled on this device"); } }
    catch { toast.error("Device registration failed. Try again."); } finally { setBusy(false); }
  };
  return <details className="rounded-lg border border-slate-800 p-3 text-xs text-slate-300"><summary className="cursor-pointer">Notification settings · {permission === "granted" ? deviceReady ? "Enabled" : "Setup incomplete" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "In-app inbox available" : "Push not enabled"}</summary><div className="mt-3 space-y-3">
    {permission === "denied" && <p>Allow notifications in your browser’s site settings, then return here to reconnect.</p>}
    {permission !== "unsupported" && <div className="flex gap-2"><Button size="sm" type="button" disabled={busy || permission === "denied"} onClick={enable}>{permission === "granted" ? "Reconnect device" : "Enable push"}</Button><Button size="sm" variant="outline" type="button" disabled={busy || !deviceReady} onClick={async () => { setBusy(true); try { const response = await fetch("/api/notifications/test", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.message); toast.success("Test notification queued. It will arrive when the worker processes it."); } catch (error: any) { toast.error(error.message); } finally { setBusy(false); } }}>Send me a test</Button></div>}
    {preferences && <><label className="flex gap-2"><input type="checkbox" checked={preferences.reminders_enabled} onChange={event => setPreferences({ ...preferences, reminders_enabled: event.target.checked })} />Remind me about unread items that need action (up to 3 reminders)</label><label className="flex items-center gap-2">Remind after<select aria-label="Reminder interval" className="rounded bg-slate-900 p-1" value={preferences.reminder_hours} onChange={event => setPreferences({ ...preferences, reminder_hours: Number(event.target.value) })}><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>72 hours</option></select></label><label className="flex gap-2"><input type="checkbox" disabled={!preferences.email_available} checked={preferences.email_fallback} onChange={event => setPreferences({ ...preferences, email_fallback: event.target.checked })} />Also email me a reminder</label>{!preferences.email_available && <p className="text-slate-500">Email reminders need server configuration.</p>}<Button size="sm" type="button" disabled={busy} onClick={async () => { setBusy(true); try { const response = await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); toast.success(data.message); } catch (error: any) { toast.error(error.message); } finally { setBusy(false); } }}>Save preferences</Button></>}
  </div></details>;
}
