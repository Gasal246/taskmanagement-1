import { getPusherInstance } from "@/lib/pusher/server";

/**
 * Lightweight notification trigger wrapper for Pusher.
 */
export async function sendTrigger(channel: string, event: string, message: any) {
  try {
    await getPusherInstance().trigger(channel, event, { message });
  } catch (error) {
    console.log("Failed to dispatch notification", error);
  }
}
