"use client";
export function announceNotificationChange() {
  window.dispatchEvent(new Event("notifications-changed"));
  window.localStorage.setItem("notifications-updated", String(Date.now()));
}
export async function updateNotification(body: Record<string, unknown>) {
  const response = await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to update notification");
  announceNotificationChange(); return data;
}
