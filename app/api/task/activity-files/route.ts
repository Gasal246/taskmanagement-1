import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import { getAdminStorageBucket } from "@/lib/firebaseAdmin";
import BusinessTasks from "@/models/business_tasks.model";
import TaskActivities from "@/models/task_activities.model";
import ActivityComments from "@/models/activity_comments.model";
import Users from "@/models/users.model";
import { authorizeActivityViewer } from "@/app/api/helpers/activity-comments";
import { canEditActivitySchedule } from "@/app/api/helpers/activity-schedule-access";
import { ACTIVITY_DOCUMENT_MAX_BYTES, getActivityDocumentExtension, getActivityDocumentMimeType, isAllowedActivityDocument, sanitizeActivityDocumentName } from "@/lib/activityDocuments";
import { ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES, getCanonicalAttachmentMimeType, isAllowedAttachmentExtension } from "@/lib/activityCommentAttachments";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const failure = (message: string, status: number) => NextResponse.json({ message }, { status });

// Use the app session for storage operations. NextAuth does not sign the browser
// into Firebase, and fetching token URLs from the browser also depends on CORS.
export async function POST(req: NextRequest) {
  const userId = resolveSessionUserId(await auth());
  if (!userId) return failure("Unauthorized", 401);
  const taskId = req.nextUrl.searchParams.get("taskId") || "";
  const activityId = req.nextUrl.searchParams.get("activityId");
  if (!mongoose.isValidObjectId(taskId) || (activityId !== null && !mongoose.isValidObjectId(activityId))) return failure("Invalid task or activity", 400);
  await connectDB();
  if (activityId) {
    const access = await authorizeActivityViewer(userId, activityId, req);
    if (access.status !== 200) return failure("Activity unavailable", access.status);
    if (String(access.task._id) !== taskId) return failure("Invalid task for activity", 400);
  } else {
    const [task, actor] = await Promise.all([BusinessTasks.findById(taskId).lean(), Users.findById(userId).lean<{ _id: unknown; status: number }>()]);
    if (!task) return failure("Task not found", 404);
    if (!actor || actor.status !== 1 || !await canEditActivitySchedule(req, task, actor)) return failure("Forbidden", 403);
  }
  const maxBytes = activityId ? ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES : ACTIVITY_DOCUMENT_MAX_BYTES;
  // Bound the multipart body as well as the extracted file, even without Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return failure("Choose a file", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes + 64 * 1024) {
      await reader.cancel();
      return failure("File is too large", 413);
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": req.headers.get("content-type") || "" } }).formData();
  } catch { return failure("Invalid file upload", 400); }
  const file = form.get("file");
  if (!file || typeof file === "string") return failure("Choose a file", 400);
  const name = file.name.trim();
  const extension = getActivityDocumentExtension(name);
  if (!name || name.length > 255 || !(activityId ? isAllowedAttachmentExtension(extension) : isAllowedActivityDocument(extension))) return failure("Unsupported file name or type", 400);
  if (file.size <= 0 || (activityId ? file.size >= maxBytes : file.size > maxBytes)) return failure(activityId ? "Attachment must be smaller than 5MB" : "Document must be between 1 byte and 10MB", 400);
  const mimeType = activityId ? getCanonicalAttachmentMimeType(extension) : getActivityDocumentMimeType(extension);
  const root = activityId ? `task-activity-comments/${taskId}/${activityId}` : `task-activity-documents/${taskId}`;
  const storagePath = `${root}/${userId}/${randomUUID()}-${sanitizeActivityDocumentName(name)}`;
  try {
    const bucket = getAdminStorageBucket();
    const token = randomUUID();
    await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: { contentType: mimeType, metadata: { taskId, ...(activityId ? { activityId } : {}), uploaderId: userId, originalName: name, firebaseStorageDownloadTokens: token } },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    return NextResponse.json({ file: { url, storagePath, name, mimeType, extension, size: file.size } }, { status: 201 });
  } catch (error) {
    console.error("Activity file upload failed", error);
    return failure("Could not upload the file. Please try again.", 502);
  }
}

export async function GET(req: NextRequest) {
  const userId = resolveSessionUserId(await auth());
  if (!userId) return failure("Unauthorized", 401);
  await connectDB();
  const commentId = req.nextUrl.searchParams.get("commentId");
  let file: { storagePath: string; name: string; mimeType: string };
  if (commentId !== null) {
    if (!mongoose.isValidObjectId(commentId)) return failure("Invalid comment", 400);
    const comment: any = await ActivityComments.findById(commentId).lean();
    if (!comment || comment.deleted_at || !comment.attachment) return failure("Attachment not found", 404);
    const access = await authorizeActivityViewer(userId, String(comment.activity_id), req);
    if (access.status !== 200) return failure("Activity unavailable", access.status);
    file = { storagePath: comment.attachment.storage_path, name: comment.attachment.name, mimeType: comment.attachment.mime_type };
  } else {
    const taskId = req.nextUrl.searchParams.get("taskId") || "";
    const storagePath = req.nextUrl.searchParams.get("storagePath") || "";
    if (!mongoose.isValidObjectId(taskId) || !storagePath.startsWith(`task-activity-documents/${taskId}/`) || storagePath.includes("..")) return failure("Invalid document", 400);
    // A file may be retained by multiple activities; any visible reference grants access.
    const activities: any[] = await TaskActivities.find({ task_id: taskId, "documents.storagePath": storagePath }).lean();
    let document: any;
    for (const activity of activities) {
      if ((await authorizeActivityViewer(userId, String(activity._id), req)).status === 200) {
        document = activity.documents.find((entry: any) => entry.storagePath === storagePath);
        break;
      }
    }
    if (!document) {
      // Preview an unsaved upload only for its uploader, who must still be an editor.
      if (activities.length || !storagePath.startsWith(`task-activity-documents/${taskId}/${userId}/`)) return failure("Forbidden", 403);
      const [task, actor] = await Promise.all([BusinessTasks.findById(taskId).lean(), Users.findById(userId).lean<{ _id: unknown; status: number }>()]);
      if (!actor || actor.status !== 1 || !await canEditActivitySchedule(req, task, actor)) return failure("Forbidden", 403);
      document = { storagePath, name: storagePath.split("/").pop(), mimeType: "application/octet-stream" };
    }
    file = document;
  }
  try {
    const [bytes] = await getAdminStorageBucket().file(file.storagePath).download();
    const disposition = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${sanitizeActivityDocumentName(file.name)}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error: any) {
    console.error("Activity file download failed", error);
    return failure(error?.code === 404 ? "File not found" : "Could not download the file", error?.code === 404 ? 404 : 502);
  }
}
