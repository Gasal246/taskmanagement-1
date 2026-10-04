"use client";
import { requestFcmToken } from "@/firebase/messaging";
let registering: Promise<void> | null = null;
let account: string | null = null;
let generation = 0;
let signingOut = false;
export function setNotificationAccount(userId: string) {
  if (account === userId && !signingOut) return;
  account = userId; generation++; signingOut = false;
  sessionStorage.removeItem("notification-device-registered-at");
  sessionStorage.removeItem("notification-device-ready");
  void navigator.serviceWorker?.getRegistration("/").then(registration => registration?.active?.postMessage({ type: "notification-account", userId })).catch(() => {});
}
export async function registerNotificationDevice(force = false): Promise<void> {
  if (signingOut) return;
  if (registering) { await registering; return registerNotificationDevice(force); }
  if (!force && Date.now() - Number(sessionStorage.getItem("notification-device-registered-at") || 0) < 3600_000) return;
  const version = generation;
  registering = (async () => {
    const token = await requestFcmToken();
    if (!token) throw new Error("Push is not available on this device");
    if (version !== generation || signingOut) return;
    localStorage.setItem("fcm-token", token);
    const response = await fetch("/api/notifications/fcm-token", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ token, platform: navigator.platform, device: navigator.userAgent }) });
    if (!response.ok) throw new Error("Unable to register this device");
    const result = await response.json();
    if (version !== generation || signingOut || (account && result.userId !== account)) return;
    sessionStorage.setItem("notification-device-registered-at", String(Date.now()));
    sessionStorage.setItem("notification-device-ready", "1");
    window.dispatchEvent(new Event("notification-device-status"));
    const registration = await navigator.serviceWorker.ready;
    if (version === generation && !signingOut) registration.active?.postMessage({ type: "notification-account", userId: result.userId });
  })().catch(error => {
    if (version === generation) { sessionStorage.removeItem("notification-device-ready"); window.dispatchEvent(new Event("notification-device-status")); }
    throw error;
  }).finally(() => { registering = null; });
  return registering;
}
export async function detachNotificationDevice() {
  signingOut = true; generation++;
  sessionStorage.removeItem("notification-device-registered-at"); sessionStorage.removeItem("notification-device-ready");
  const registration = await navigator.serviceWorker?.getRegistration("/");
  registration?.active?.postMessage({ type: "notification-account", userId: null });
  const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
  await nav.clearAppBadge?.().catch(() => {});
  // Finish an in-flight registration before detaching, so it cannot reattach after logout.
  await registering?.catch(() => {});
  const token = localStorage.getItem("fcm-token");
  if (token) await fetch("/api/notifications/fcm-token", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(10_000), keepalive: true });
}
