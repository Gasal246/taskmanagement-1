import { createHash, randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import Jobs from "@/models/background_jobs.model";

export const MAX_ATTEMPTS = 8;
export const BATCH_SIZE = 100;
export type JobKind = "notification" | "push" | "storage-delete";
export type InboxRecord = {
  recipient_id: unknown; sender_id: unknown; kind: string; title: string; body: string;
  data: Record<string, string>; meta: Record<string, unknown>; read_at: null;
};
export type PushMessage = { notification: { title: string; body: string }; data: Record<string, string> };
export const storageJobKey = (path: string) => `storage:${createHash("sha256").update(path).digest("hex")}`;
export function validStoragePath(path: string) {
  if (path.length > 1024) return false;
  return /^task-activity-documents\/[a-f0-9]{24}\/[a-f0-9]{24}\/[^/]+$/i.test(path) ||
    /^task-activity-comments\/[a-f0-9]{24}\/[a-f0-9]{24}\/[a-f0-9]{24}\/[^/]+$/i.test(path);
}
export async function enqueueJob(kind: JobKind, key: string, payload: unknown, session?: ClientSession) {
  if (!key || key.length > 240 || Buffer.byteLength(JSON.stringify(payload)) > 512_000) {
    throw new Error("Invalid background job payload");
  }
  await Jobs.updateOne({ dedupe_key: key }, { $setOnInsert: {
    kind, payload, status: "pending", attempts: 0, available_at: new Date(),
  } }, { upsert: true, session });
}
export async function enqueueNotifications(records: InboxRecord[], push: PushMessage, key: string = randomUUID(), session?: ClientSession) {
  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);
    await enqueueJob("notification", `notification:${key}:${offset / BATCH_SIZE}`, {
      records: batch, push, recipientIds: [...new Set(batch.map(record => String(record.recipient_id)))],
    }, session);
  }
}
export async function enqueueFileCleanup(paths: Array<string | null | undefined>, session?: ClientSession) {
  const unique = [...new Set(paths.filter((value): value is string => Boolean(value)))];
  for (const path of unique) {
    if (!validStoragePath(path) || path.split("/").some(part => part === "." || part === "..")) {
      throw new Error("Unsafe file cleanup path");
    }
  }
  // Cascade deletes can contain many uploads. Batch the queue writes, while retaining
  // one independently retryable job per file and sequential transaction operations.
  for (let offset = 0; offset < unique.length; offset += BATCH_SIZE) {
    await Jobs.bulkWrite(unique.slice(offset, offset + BATCH_SIZE).map(path => ({ updateOne: {
      filter: { dedupe_key: storageJobKey(path) },
      update: { $setOnInsert: { kind: "storage-delete", payload: { path }, status: "pending",
        attempts: 0, available_at: new Date(), last_error: null, lease_token: null, lease_until: null,
        purge_at: null, completed_at: null, retry_count: 0,
      } }, upsert: true,
    } })), { session, ordered: true });
  }
}
// Reusing a retired upload can race the cleanup worker. Upload paths are UUID based;
// retained files are checked separately by the edit route, while new references must be fresh.
export async function assertUploadNotRetired(path: string, session?: ClientSession) {
  if (await Jobs.exists({ dedupe_key: storageJobKey(path) }).session(session ?? null)) {
    throw new Error("This upload has been retired. Upload the file again.");
  }
}
