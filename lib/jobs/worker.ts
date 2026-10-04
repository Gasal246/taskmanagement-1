import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Jobs from "@/models/background_jobs.model";
import Notifications from "@/models/notifications.model";
import FcmTokens from "@/models/fcm_tokens.model";
import ActivityComments from "@/models/activity_comments.model";
import TaskActivities from "@/models/task_activities.model";
import { getAdminMessaging, getBackgroundStorageBucket } from "@/lib/firebaseAdmin";
import { BATCH_SIZE, enqueueJob, MAX_ATTEMPTS, validStoragePath } from "./enqueue";
import { inTransaction } from "./transaction";

const LEASE_MS = 120_000;
const RETENTION_MS = 30 * 86400_000;
const invalidTokenCodes = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
const transientCodes = new Set(["messaging/server-unavailable", "messaging/internal-error", "messaging/unknown-error", "messaging/quota-exceeded", "messaging/message-rate-exceeded", "app/network-error", "app/network-timeout"]);
export class JobError extends Error {
  constructor(public code: string, public permanent = false) { super(code); }
}
// Never persist provider error text: it can contain tokens, credentials or request URLs.
function errorCode(error: unknown) {
  if (error instanceof JobError) return error.code;
  const code = String((error as { code?: unknown })?.code || "");
  return /^(messaging|app)\/[a-z-]{1,64}$/.test(code) ? code : "job/provider-or-database-error";
}
const owned = (job: any) => ({ _id: job._id, status: "processing", lease_token: job.lease_token });
export async function claimJob(now = new Date()) {
  await Jobs.updateMany({ status: "processing", lease_until: { $lte: now }, attempts: { $gte: MAX_ATTEMPTS } }, {
    $set: { status: "failed", last_error: "job/lease-expired", lease_until: null, lease_token: null },
  });
  return Jobs.findOneAndUpdate({ attempts: { $lt: MAX_ATTEMPTS }, $or: [
    { status: "pending", available_at: { $lte: now } },
    { status: "processing", lease_until: { $lte: now } },
  ] }, { $set: { status: "processing", lease_token: randomUUID(), lease_until: new Date(now.getTime() + LEASE_MS) },
    $inc: { attempts: 1 } }, { new: true, sort: { available_at: 1, createdAt: 1 } }).lean();
}
export async function finishJob(job: any) {
  const now = new Date();
  return Jobs.updateOne(owned(job), { $set: {
    status: "completed", completed_at: now, purge_at: new Date(now.getTime() + RETENTION_MS),
    lease_until: null, lease_token: null, last_error: null,
    // Completed jobs retain dedupe keys, not recipients, device tokens or file paths.
    payload: {},
  } });
}
export async function failJob(job: any, error: unknown) {
  const failed = job.attempts >= MAX_ATTEMPTS || (error instanceof JobError && error.permanent);
  const delay = Math.min(900_000, 60_000 * 2 ** Math.max(0, job.attempts - 1)) * (1 + Math.random() * 0.2);
  return Jobs.updateOne(owned(job), { $set: {
    status: failed ? "failed" : "pending", last_error: errorCode(error),
    available_at: new Date(Date.now() + delay), lease_until: null, lease_token: null,
  } });
}
export type Providers = {
  messaging: typeof getAdminMessaging;
  storage: typeof getBackgroundStorageBucket;
};
const defaultProviders: Providers = { messaging: getAdminMessaging, storage: getBackgroundStorageBucket };

async function materializeNotification(job: any) {
  const { records, recipientIds, push } = job.payload;
  if (!Array.isArray(records) || !records.length || records.length > BATCH_SIZE || !Array.isArray(recipientIds)) {
    throw new JobError("job/invalid-notification", true);
  }
  await inTransaction(async session => {
    // A stale worker cannot create inbox rows or child jobs after losing its lease.
    const fence = await Jobs.updateOne(owned(job), { $set: { lease_until: new Date(Date.now() + LEASE_MS) } }, { session });
    if (!fence.matchedCount) throw new JobError("job/lease-lost");
    await Notifications.bulkWrite(records.map((record: any, index: number) => ({ updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(createHash("sha256").update(`${job.dedupe_key}:${index}`).digest("hex").slice(0, 24)) },
      update: { $setOnInsert: { ...record, createdAt: job.createdAt, updatedAt: job.createdAt } },
      upsert: true, timestamps: false,
    } })), { session });
    // Stream devices; never load an unbounded device list or exceed FCM's multicast limit.
    const cursor = FcmTokens.find({ user_id: { $in: recipientIds } }).select("user_id token").sort({ _id: 1 }).session(session).lean().cursor();
    let devices: any[] = [];
    let batch = 0;
    try {
      for await (const device of cursor) {
        devices.push({ id: String(device._id), userId: String(device.user_id), token: device.token });
        if (devices.length === BATCH_SIZE) {
          await enqueueJob("push", `push:${job.dedupe_key}:${batch++}`, { devices, push }, session);
          devices = [];
        }
      }
      if (devices.length) await enqueueJob("push", `push:${job.dedupe_key}:${batch}`, { devices, push }, session);
    } finally { await cursor.close(); }
    // Parent and child writes commit together. Retrying the parent never resets read state.
    await Jobs.updateOne(owned(job), { $set: {
      status: "completed", completed_at: new Date(), purge_at: new Date(Date.now() + RETENTION_MS),
      payload: {}, lease_token: null, lease_until: null, last_error: null,
    } }, { session });
    return true;
  });
}
async function deliverPush(job: any, providers: Providers) {
  const { devices, push } = job.payload;
  if (!Array.isArray(devices) || devices.length > BATCH_SIZE || !push?.notification || !push?.data) {
    throw new JobError("job/invalid-push", true);
  }
  const current = await FcmTokens.find({ _id: { $in: devices.map((device: any) => device.id) } }).select("user_id token").lean();
  const currentKeys = new Set(current.map((doc: any) => `${doc._id}:${doc.user_id}:${doc.token}`));
  const active = devices.filter((device: any) => currentKeys.has(`${device.id}:${device.userId}:${device.token}`));
  if (!active.length) return;
  const result = await providers.messaging().sendEachForMulticast({ tokens: active.map((device: any) => device.token), ...push });
  const remaining: any[] = [];
  let permanentCode = "";
  let retryCode = "";
  for (let index = 0; index < active.length; index++) {
    const response = result.responses[index];
    if (response?.success) continue;
    const code = response?.error?.code || "messaging/unknown-error";
    const device = active[index];
    if (invalidTokenCodes.has(code)) {
      await FcmTokens.deleteOne({ _id: device.id, user_id: device.userId, token: device.token });
    } else {
      remaining.push(device);
      if (transientCodes.has(code)) retryCode = code;
      else permanentCode = code;
    }
  }
  // Save only unconfirmed devices before retrying; confirmed successes are not resent.
  const checkpoint = await Jobs.updateOne(owned(job), { $set: { "payload.devices": remaining } });
  if (!checkpoint.matchedCount) throw new JobError("job/lease-lost");
  if (permanentCode) throw new JobError(errorCode({ code: permanentCode }), true);
  if (remaining.length) throw new JobError(retryCode || "messaging/unknown-error");
}
async function deleteFile(job: any, providers: Providers) {
  const path = job.payload?.path;
  if (typeof path !== "string" || !validStoragePath(path) || path.split("/").some(part => part === "." || part === "..")) {
    throw new JobError("job/unsafe-storage-path", true);
  }
  if (await TaskActivities.exists({ "documents.storagePath": path }) ||
    await ActivityComments.exists({ "attachment.storage_path": path, deleted_at: null })) return;
  const file = providers.storage().file(path);
  try {
    const [metadata] = await file.getMetadata();
    // A replacement upload must not be deleted based on an earlier object's metadata.
    if (!metadata.generation) throw new JobError("job/missing-file-generation", true);
    await file.delete({ ifGenerationMatch: metadata.generation });
  } catch (error) {
    if (Number((error as { code?: unknown })?.code) === 404) return;
    if (Number((error as { code?: unknown })?.code) === 412) throw new JobError("job/file-generation-changed", true);
    throw error;
  }
}
export async function processJob(job: any, providers = defaultProviders) {
  if (!await Jobs.exists({ ...owned(job), lease_until: { $gt: new Date() } })) return;
  let lost = false;
  let heartbeat: Promise<unknown> | null = null;
  const timer = setInterval(() => {
    if (heartbeat) return;
    heartbeat = Jobs.updateOne(owned(job), { $set: { lease_until: new Date(Date.now() + LEASE_MS) } }).then(result => {
      if (!result.matchedCount) lost = true;
    }).catch(() => { lost = true; }).finally(() => { heartbeat = null; });
  }, 20_000);
  timer.unref();
  try {
    if (job.kind === "notification") await materializeNotification(job);
    else if (job.kind === "push") await deliverPush(job, providers);
    else if (job.kind === "storage-delete") await deleteFile(job, providers);
    else throw new JobError("job/unknown-kind", true);
    if (!lost && job.kind !== "notification") await finishJob(job);
  } catch (error) {
    if (!lost) await failJob(job, error);
  } finally {
    clearInterval(timer);
    if (heartbeat) await heartbeat;
  }
}
export async function runJobBatch({ maxJobs = 20, timeBudgetMs = 35_000, providers = defaultProviders } = {}) {
  const deadline = Date.now() + timeBudgetMs;
  let processed = 0;
  while (processed < maxJobs && Date.now() < deadline) {
    const job = await claimJob();
    if (!job) break;
    await processJob(job, providers);
    processed++;
  }
  return { processed };
}
