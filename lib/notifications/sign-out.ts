"use client";
import { signOut } from "next-auth/react";
import { detachNotificationDevice } from "./device";
export async function notificationSignOut(options?: Parameters<typeof signOut>[0]) {
  try { await detachNotificationDevice(); } catch { /* End the session even if the device is offline. */ }
  return signOut(options);
}
