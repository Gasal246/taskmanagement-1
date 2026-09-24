export const ACTIVITY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ACTIVITY_DOCUMENT_ACCEPT = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip",
].join(",");

export type ActivityDocument = {
  url: string;
  storagePath: string;
  name: string;
  mimeType: string;
  extension: string;
  size: number;
};

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", csv: "text/csv", zip: "application/zip",
};

export const getActivityDocumentExtension = (name: string) => {
  const parts = name.trim().toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
};
export const isAllowedActivityDocument = (extension: string) => Boolean(MIME_TYPES[extension.toLowerCase()]);
export const getActivityDocumentMimeType = (extension: string) => MIME_TYPES[extension.toLowerCase()] || "application/octet-stream";
export const sanitizeActivityDocumentName = (name: string) =>
  (name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "document").slice(-180);

