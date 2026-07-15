export const ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const ACTIVITY_COMMENT_ATTACHMENT_ACCEPT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
].join(",");

export type ActivityCommentAttachment = {
  url: string;
  name: string;
  mimeType: string;
  extension: string;
  size: number;
};

export type ActivityCommentAttachmentPayload = ActivityCommentAttachment & {
  storagePath: string;
};

const MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

export const getAttachmentExtension = (name: string) => {
  const extension = name.trim().toLowerCase().split(".").pop() || "";
  return extension === name.trim().toLowerCase() ? "" : extension;
};

export const isAllowedAttachmentExtension = (extension: string) =>
  Object.prototype.hasOwnProperty.call(MIME_TYPES_BY_EXTENSION, extension.toLowerCase());

export const getCanonicalAttachmentMimeType = (extension: string) =>
  MIME_TYPES_BY_EXTENSION[extension.toLowerCase()]?.[0] || "application/octet-stream";

export const isMimeTypeAllowedForExtension = (mimeType: string, extension: string) => {
  if (!mimeType) return true;
  return MIME_TYPES_BY_EXTENSION[extension.toLowerCase()]?.includes(mimeType.toLowerCase()) || false;
};

export const isImageAttachment = (attachment: Pick<ActivityCommentAttachment, "extension" | "mimeType">) =>
  ["jpg", "jpeg", "png", "gif", "webp"].includes(attachment.extension.toLowerCase()) ||
  ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(attachment.mimeType.toLowerCase());

export const isPdfAttachment = (attachment: Pick<ActivityCommentAttachment, "extension" | "mimeType">) =>
  attachment.extension.toLowerCase() === "pdf" || attachment.mimeType.toLowerCase() === "application/pdf";

export const isWordAttachment = (attachment: Pick<ActivityCommentAttachment, "extension">) =>
  ["doc", "docx"].includes(attachment.extension.toLowerCase());

export const isExcelAttachment = (attachment: Pick<ActivityCommentAttachment, "extension">) =>
  ["xls", "xlsx"].includes(attachment.extension.toLowerCase());

export const sanitizeAttachmentFileName = (name: string) => {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (cleaned || "attachment").slice(-180);
};
