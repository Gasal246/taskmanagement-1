import { getAdminStorageBucket } from "@/lib/firebaseAdmin";
import {
  ACTIVITY_DOCUMENT_MAX_BYTES,
  ActivityDocument,
  getActivityDocumentExtension,
  getActivityDocumentMimeType,
  isAllowedActivityDocument,
} from "@/lib/activityDocuments";

const ROOT = "task-activity-documents";

export class ActivityDocumentValidationError extends Error {
  status = 400;
}

const isMissing = (error: any) => error?.code === 404 || error?.code === "404" || error?.code === "storage/object-not-found";

const objectFromUrl = (value: string) => {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/b\/([^/]+)\/o\/(.+)$/);
    return url.protocol === "https:" && url.hostname === "firebasestorage.googleapis.com" && match
      ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) }
      : null;
  } catch { return null; }
};

export async function validateActivityDocuments(value: unknown, context: { taskId: string }) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) throw new ActivityDocumentValidationError("An activity can have up to 20 documents");
  const bucket = getAdminStorageBucket();
  const prefix = `${ROOT}/${context.taskId}/`;
  return Promise.all(value.map(async (item): Promise<ActivityDocument> => {
    const input = (item || {}) as Record<string, unknown>;
    const document = {
      url: String(input.url || "").trim(), storagePath: String(input.storagePath || "").trim(),
      name: String(input.name || "").trim(), mimeType: String(input.mimeType || "").trim().toLowerCase(),
      extension: String(input.extension || "").trim().toLowerCase(), size: Number(input.size),
    };
    const extension = getActivityDocumentExtension(document.name);
    if (!document.name || document.name.length > 255 || extension !== document.extension || !isAllowedActivityDocument(extension))
      throw new ActivityDocumentValidationError("Unsupported document type");
    if (!Number.isInteger(document.size) || document.size <= 0 || document.size > ACTIVITY_DOCUMENT_MAX_BYTES)
      throw new ActivityDocumentValidationError("Each document must be 10MB or smaller");
    const relative = document.storagePath.slice(prefix.length);
    const pathParts = relative.split("/");
    if (!document.storagePath.startsWith(prefix) || pathParts.length !== 2 || !pathParts[0] || !pathParts[1] || document.storagePath.includes(".."))
      throw new ActivityDocumentValidationError("Invalid document storage path");
    const urlObject = objectFromUrl(document.url);
    if (!urlObject || urlObject.bucket !== bucket.name || urlObject.path !== document.storagePath)
      throw new ActivityDocumentValidationError("Invalid document URL");
    let metadata: any;
    try { [metadata] = await bucket.file(document.storagePath).getMetadata(); }
    catch (error) { if (isMissing(error)) throw new ActivityDocumentValidationError("Uploaded document was not found"); throw error; }
    const expectedMime = getActivityDocumentMimeType(extension);
    if (Number(metadata.size) !== document.size || String(metadata.contentType || "").toLowerCase() !== expectedMime ||
        metadata.metadata?.taskId !== context.taskId || metadata.metadata?.uploaderId !== pathParts[0] || metadata.metadata?.originalName !== document.name)
      throw new ActivityDocumentValidationError("Document metadata does not match the uploaded file");
    return { ...document, mimeType: expectedMime };
  }));
}

export async function deleteActivityDocuments(documents: Array<{ storagePath?: string }> = []) {
  await Promise.all(documents.map(async ({ storagePath }) => {
    if (!storagePath) return;
    try { await getAdminStorageBucket().file(storagePath).delete(); }
    catch (error) { if (!isMissing(error)) throw error; }
  }));
}
