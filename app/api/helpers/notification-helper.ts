import { getPusherInstance } from "@/lib/pusher/server";

const pusher = getPusherInstance();

/**
 * Lightweight notification trigger wrapper for Pusher.
 */
export async function sendTrigger(channel: string, event: string, message: any) {
  try {
    await pusher.trigger(channel, event, { message });
  } catch (error) {
    console.log("Failed to dispatch notification", error);
  }
}
