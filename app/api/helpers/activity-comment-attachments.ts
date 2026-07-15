import { getAdminStorageBucket } from "@/lib/firebaseAdmin";
import {
  ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES,
  ActivityCommentAttachmentPayload,
  getAttachmentExtension,
  getCanonicalAttachmentMimeType,
  isAllowedAttachmentExtension,
  isMimeTypeAllowedForExtension,
} from "@/lib/activityCommentAttachments";

const STORAGE_ROOT = "task-activity-comments";

export class AttachmentValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AttachmentValidationError";
    this.status = status;
  }
}

const isMissingObjectError = (error: any) =>
  error?.code === 404 || error?.code === "404" || error?.code === "storage/object-not-found";

const storageObjectFromUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com") return null;
    const bucketMatch = url.pathname.match(/\/b\/([^/]+)\/o\//);
    const markerIndex = url.pathname.indexOf("/o/");
    if (!bucketMatch || markerIndex < 0) return null;
    return {
      bucket: decodeURIComponent(bucketMatch[1]),
      path: decodeURIComponent(url.pathname.slice(markerIndex + 3)),
    };
  } catch {
    return null;
  }
};

export async function validateActivityCommentAttachment(
  value: unknown,
  context: { taskId: string; activityId: string; userId: string }
): Promise<ActivityCommentAttachmentPayload> {
  if (!value || typeof value !== "object") {
    throw new AttachmentValidationError("Invalid attachment");
  }

  const input = value as Record<string, unknown>;
  const attachment: ActivityCommentAttachmentPayload = {
    url: String(input.url || "").trim(),
    storagePath: String(input.storagePath || "").trim(),
    name: String(input.name || "").trim(),
    mimeType: String(input.mimeType || "").trim().toLowerCase(),
    extension: String(input.extension || "").trim().toLowerCase(),
    size: Number(input.size),
  };

  if (!attachment.name || attachment.name.length > 255) {
    throw new AttachmentValidationError("Invalid attachment name");
  }
  if (
    !attachment.extension ||
    attachment.extension !== getAttachmentExtension(attachment.name) ||
    !isAllowedAttachmentExtension(attachment.extension) ||
    !isMimeTypeAllowedForExtension(attachment.mimeType, attachment.extension)
  ) {
    throw new AttachmentValidationError("Unsupported attachment type");
  }
  if (!Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size >= ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES) {
    throw new AttachmentValidationError("Attachment must be smaller than 5MB");
  }

  const requiredPrefix = `${STORAGE_ROOT}/${context.taskId}/${context.activityId}/${context.userId}/`;
  const relativePath = attachment.storagePath.slice(requiredPrefix.length);
  if (
    !attachment.storagePath.startsWith(requiredPrefix) ||
    !relativePath ||
    relativePath.includes("/") ||
    attachment.storagePath.includes("..")
  ) {
    throw new AttachmentValidationError("Invalid attachment storage path");
  }
  const bucket = getAdminStorageBucket();
  const urlObject = storageObjectFromUrl(attachment.url);
  if (!urlObject || urlObject.bucket !== bucket.name || urlObject.path !== attachment.storagePath) {
    throw new AttachmentValidationError("Invalid attachment URL");
  }

  const file = bucket.file(attachment.storagePath);
  let metadata: any;
  try {
    [metadata] = await file.getMetadata();
  } catch (error) {
    if (isMissingObjectError(error)) throw new AttachmentValidationError("Uploaded attachment was not found", 400);
    throw error;
  }

  const storedSize = Number(metadata.size);
  const expectedMimeType = getCanonicalAttachmentMimeType(attachment.extension);
  if (
    storedSize !== attachment.size ||
    storedSize >= ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES ||
    String(metadata.contentType || "").toLowerCase() !== expectedMimeType ||
    metadata.metadata?.taskId !== context.taskId ||
    metadata.metadata?.activityId !== context.activityId ||
    metadata.metadata?.uploaderId !== context.userId ||
    metadata.metadata?.originalName !== attachment.name
  ) {
    throw new AttachmentValidationError("Attachment metadata does not match the uploaded file");
  }

  return { ...attachment, mimeType: expectedMimeType };
}

export async function deleteActivityCommentAttachment(storagePath?: string | null) {
  if (!storagePath) return;
  try {
    await getAdminStorageBucket().file(storagePath).delete();
  } catch (error) {
    if (!isMissingObjectError(error)) throw error;
  }
}

export async function deleteActivityCommentAttachments(comments: any[]) {
  const paths = Array.from(new Set(
    comments
      .map((comment) => comment?.attachment?.storage_path)
      .filter((path): path is string => typeof path === "string" && Boolean(path))
  ));
  await Promise.all(paths.map((path) => deleteActivityCommentAttachment(path)));
}
