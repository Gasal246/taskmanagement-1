import Heartbeats from "@/models/worker_heartbeats.model";
import Jobs from "@/models/background_jobs.model";
export async function recordWorkerHeartbeat() {
  await Heartbeats.updateOne({ _id: "notification-worker" }, { $set: { last_seen_at: new Date() } }, { upsert: true });
}
export async function notificationWorkerHealth() {
  const [heartbeat, oldest, failed]: any[] = await Promise.all([
    Heartbeats.findById("notification-worker").lean(),
    Jobs.findOne({ status: "pending", available_at: { $lte: new Date() } }).sort({ available_at: 1 }).select("available_at").lean(),
    Jobs.countDocuments({ status: "failed", kind: { $in: ["push", "notification", "notification-email"] } }),
  ]);
  const now = Date.now(); const alive = Boolean(heartbeat && now - new Date(heartbeat.last_seen_at).getTime() < 180_000);
  const delayed = Boolean(oldest && now - new Date(oldest.available_at).getTime() > 300_000);
  return { healthy: alive && !delayed, workerAlive: alive, queueDelayed: delayed, failedNotifications: failed, lastHeartbeatAt: heartbeat?.last_seen_at || null };
}
