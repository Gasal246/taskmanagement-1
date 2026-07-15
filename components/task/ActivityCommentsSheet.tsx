"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Avatar } from "antd";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FileSpreadsheet, FileText, Loader2, MessageCircle, MessagesSquare, Paperclip, Reply, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { storage } from "@/firebase/config";
import {
  ACTIVITY_COMMENT_ATTACHMENT_ACCEPT,
  ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES,
  ActivityCommentAttachment,
  ActivityCommentAttachmentPayload,
  getAttachmentExtension,
  getCanonicalAttachmentMimeType,
  isAllowedAttachmentExtension,
  isExcelAttachment,
  isImageAttachment,
  isMimeTypeAllowedForExtension,
  isPdfAttachment,
  isWordAttachment,
  sanitizeAttachmentFileName,
} from "@/lib/activityCommentAttachments";

export type ActivityComment = {
  id: string;
  activityId: string;
  taskId: string;
  parentId: string | null;
  rootId: string | null;
  depth: number;
  body: string;
  attachment: ActivityCommentAttachment | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isSeen: boolean;
  canDelete: boolean;
  author: { id: string; name: string; avatarUrl: string };
};

type PendingAttachment = {
  file: File;
  previewUrl: string | null;
  attachment: ActivityCommentAttachment;
};

type CommentsResponse = { comments: ActivityComment[] };

const requestJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Something went wrong");
  return data;
};

const formatCommentDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function AttachmentTile({
  attachment,
  onOpen,
  onRemove,
  disabled = false,
}: {
  attachment: ActivityCommentAttachment;
  onOpen?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const image = isImageAttachment(attachment);
  const pdf = isPdfAttachment(attachment);
  const word = isWordAttachment(attachment);
  const excel = isExcelAttachment(attachment);
  const label = attachment.extension ? attachment.extension.toUpperCase() : "DOC";

  return (
    <div
      className={cn(
        "relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm",
        onOpen && "transition hover:border-cyan-600 hover:ring-2 hover:ring-cyan-500/10"
      )}
      title={attachment.name}
    >
      {image && attachment.url ? (
        <Image
          src={attachment.url}
          alt={attachment.name}
          fill
          unoptimized
          sizes="100px"
          className="object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1.5",
            pdf && "bg-red-950/60 text-red-300",
            word && "bg-blue-950/60 text-blue-300",
            excel && "bg-emerald-950/60 text-emerald-300",
            !pdf && !word && !excel && "bg-slate-900 text-slate-300"
          )}
        >
          {excel ? <FileSpreadsheet size={30} /> : <FileText size={30} />}
          <span className="max-w-[82px] truncate rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
            {label}
          </span>
        </div>
      )}
      {onOpen && (
        <button
          type="button"
          disabled={disabled}
          onClick={onOpen}
          className="absolute inset-0 z-[1] cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-default"
          aria-label={`Open ${attachment.name}`}
        />
      )}
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-slate-950/90 p-1 text-slate-200 shadow transition hover:bg-rose-700 hover:text-white disabled:opacity-50"
          aria-label={`Remove ${attachment.name}`}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  children,
  onReply,
  onDelete,
  onView,
  onAttachmentClick,
  deleting,
}: {
  comment: ActivityComment;
  children: React.ReactNode;
  onReply: (comment: ActivityComment) => void;
  onDelete: (comment: ActivityComment) => void;
  onView: (id: string) => void;
  onAttachmentClick: (attachment: ActivityCommentAttachment) => void;
  deleting: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rowRef.current;
    if (!node || comment.isSeen || comment.deletedAt) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          onView(comment.id);
          observer.disconnect();
        }
      },
      { threshold: [0.55] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [comment.deletedAt, comment.id, comment.isSeen, onView]);

  return (
    <div
      className={cn(
        "relative",
        comment.depth > 0 &&
          "ml-4 border-l border-slate-800 pl-4 before:absolute before:left-0 before:top-7 before:h-px before:w-4 before:bg-slate-800 sm:ml-8 sm:pl-5 sm:before:w-5"
      )}
    >
      <article
        ref={rowRef}
        className={cn(
          "group relative mb-3 overflow-hidden rounded-2xl border p-3.5 shadow-sm transition-all duration-200 sm:p-4",
          comment.canDelete
            ? "border-cyan-900/50 bg-gradient-to-br from-cyan-950/20 to-slate-950/80"
            : "border-slate-800/90 bg-gradient-to-br from-slate-900/70 to-slate-950/80",
          !comment.isSeen && "border-cyan-600/60 ring-1 ring-cyan-500/10",
          comment.id.startsWith("temp-") && "animate-pulse"
        )}
      >
        {!comment.isSeen && !comment.deletedAt && (
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
        )}
        <time className="mb-2.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
          {formatCommentDate(comment.createdAt)}
        </time>
        {comment.deletedAt ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-3 py-3 text-sm italic text-slate-500">
            <MessageCircle size={15} /> Comment deleted
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="rounded-full ring-2 ring-slate-800 ring-offset-2 ring-offset-slate-950">
                <Avatar src={comment.author.avatarUrl || "/avatar.png"} size={32} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {comment.author.name}
                  {comment.canDelete && (
                    <span className="ml-2 rounded-full border border-cyan-800/70 bg-cyan-950/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
                      You
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  {comment.depth === 0 ? "Comment" : `Reply · Level ${comment.depth}`}
                </p>
              </div>
            </div>
            {comment.body && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {comment.body}
              </p>
            )}
            {comment.attachment && (
              <div className="mt-3">
                <AttachmentTile
                  attachment={comment.attachment}
                  onOpen={() => onAttachmentClick(comment.attachment!)}
                />
              </div>
            )}
            <div className="mt-3 flex items-center gap-1 border-t border-slate-800/70 pt-2.5">
              {comment.depth < 2 && !comment.id.startsWith("temp-") && (
                <button
                  type="button"
                  onClick={() => onReply(comment)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-cyan-950/50 hover:text-cyan-300"
                >
                  <Reply size={12} /> Reply
                </button>
              )}
              {comment.canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger
                    type="button"
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-slate-500 transition hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        The comment and its attachment will be deleted. Replies will remain visible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(comment)}
                        className="bg-rose-700 text-white hover:bg-rose-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )}
      </article>
      {children}
    </div>
  );
}

export default function ActivityCommentsSheet({
  activity,
  taskId,
  initiallyOpen = false,
}: {
  activity: any;
  taskId: string;
  initiallyOpen?: boolean;
}) {
  const activityId = String(activity?._id || "");
  const queryKey = useMemo(() => ["activity-comments", activityId], [activityId]);
  const { data: session }: any = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(initiallyOpen);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ActivityComment | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<ActivityCommentAttachment | null>(null);
  const [unreadCount, setUnreadCount] = useState(Number(activity?.unread_comment_count || 0));
  const [totalCount, setTotalCount] = useState(Number(activity?.comment_count || 0));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSeen = useRef(new Set<string>());
  const seenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setUnreadCount(Number(activity?.unread_comment_count || 0)), [activity?.unread_comment_count]);
  useEffect(() => setTotalCount(Number(activity?.comment_count || 0)), [activity?.comment_count]);
  useEffect(() => {
    if (initiallyOpen) setOpen(true);
  }, [initiallyOpen]);
  useEffect(() => {
    const previewUrl = pendingAttachment?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [pendingAttachment?.previewUrl]);

  const commentsQuery = useQuery<CommentsResponse>({
    queryKey,
    enabled: open && Boolean(activityId),
    queryFn: () => requestJson(`/api/task/activities/${activityId}/comments`),
    refetchOnWindowFocus: true,
  });
  const comments = useMemo(() => commentsQuery.data?.comments || [], [commentsQuery.data?.comments]);

  useEffect(() => {
    if (!commentsQuery.data) return;
    setUnreadCount(comments.filter((comment) => !comment.isSeen && !comment.deletedAt).length);
    setTotalCount(comments.filter((comment) => !comment.deletedAt).length);
  }, [comments, commentsQuery.data]);

  const addComment = useMutation({
    mutationFn: async (variables: { body: string; parent: ActivityComment | null; pending: PendingAttachment | null }) => {
      const userId = String(session?.user?.id || "");
      let uploadedRef: ReturnType<typeof ref> | null = null;
      let uploaded = false;
      let attachment: ActivityCommentAttachmentPayload | null = null;

      try {
        if (variables.pending) {
          if (!userId) throw new Error("Your session could not be verified. Please sign in again.");
          const { file } = variables.pending;
          const extension = getAttachmentExtension(file.name);
          const mimeType = getCanonicalAttachmentMimeType(extension);
          const uniqueId = typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const storagePath = `task-activity-comments/${taskId}/${activityId}/${userId}/${uniqueId}-${sanitizeAttachmentFileName(file.name)}`;
          uploadedRef = ref(storage, storagePath);
          await uploadBytes(uploadedRef, file, {
            contentType: mimeType,
            customMetadata: {
              taskId,
              activityId,
              uploaderId: userId,
              originalName: file.name,
            },
          });
          uploaded = true;
          attachment = {
            url: await getDownloadURL(uploadedRef),
            storagePath,
            name: file.name,
            mimeType,
            extension,
            size: file.size,
          };
        }

        return await requestJson(`/api/task/activities/${activityId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: variables.body,
            parentId: variables.parent?.id || null,
            attachment,
          }),
        });
      } catch (error) {
        if (uploaded && uploadedRef) {
          try {
            await deleteObject(uploadedRef);
          } catch (cleanupError) {
            console.log("Failed to roll back activity comment attachment", cleanupError);
          }
        }
        throw error;
      }
    },
    onMutate: async ({ body, parent, pending }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentsResponse>(queryKey);
      const tempId = `temp-${Date.now()}`;
      const temp: ActivityComment = {
        id: tempId,
        activityId,
        taskId,
        parentId: parent?.id || null,
        rootId: parent ? parent.rootId || parent.id : null,
        depth: parent ? parent.depth + 1 : 0,
        body,
        attachment: pending?.attachment || null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSeen: true,
        canDelete: false,
        author: { id: session?.user?.id || "me", name: "You", avatarUrl: "" },
      };
      queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({ comments: [...(old?.comments || []), temp] }));
      return { previous, tempId };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(error.message);
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({
        comments: (old?.comments || []).map((comment) => comment.id === context?.tempId ? data.comment : comment),
      }));
      setDraft("");
      setReplyTo(null);
      setPendingAttachment(null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteComment = useMutation({
    mutationFn: (comment: ActivityComment) =>
      requestJson(`/api/task/activities/comments/${comment.id}`, { method: "DELETE" }),
    onMutate: async (comment) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentsResponse>(queryKey);
      queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({
        comments: (old?.comments || []).map((item) => item.id === comment.id
          ? { ...item, body: "", attachment: null, deletedAt: new Date().toISOString(), canDelete: false, isSeen: true }
          : item),
      }));
      return { previous };
    },
    onError: (error: Error, _comment, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const flushSeen = useCallback(async () => {
    const ids = Array.from(pendingSeen.current);
    pendingSeen.current.clear();
    if (!ids.length) return;
    try {
      await requestJson(`/api/task/activities/${activityId}/comments/seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds: ids }),
      });
    } catch {
      queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({
        comments: (old?.comments || []).map((comment) => ids.includes(comment.id) ? { ...comment, isSeen: false } : comment),
      }));
      setUnreadCount((count) => count + ids.length);
    }
  }, [activityId, queryClient, queryKey]);

  const handleView = useCallback((id: string) => {
    let changed = false;
    queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({
      comments: (old?.comments || []).map((comment) => {
        if (comment.id !== id || comment.isSeen) return comment;
        changed = true;
        return { ...comment, isSeen: true };
      }),
    }));
    if (!changed) return;
    setUnreadCount((count) => Math.max(0, count - 1));
    pendingSeen.current.add(id);
    if (seenTimer.current) clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => void flushSeen(), 300);
  }, [flushSeen, queryClient, queryKey]);

  useEffect(() => () => {
    if (seenTimer.current) clearTimeout(seenTimer.current);
    if (pendingSeen.current.size) void flushSeen();
  }, [flushSeen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = getAttachmentExtension(file.name);
    if (!isAllowedAttachmentExtension(extension) || !isMimeTypeAllowedForExtension(file.type, extension)) {
      toast.error("Unsupported file type", {
        description: "Choose an image, PDF, Word, or Excel file.",
      });
      return;
    }
    if (file.size <= 0 || file.size >= ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES) {
      toast.error("File must be smaller than 5MB");
      return;
    }

    const mimeType = getCanonicalAttachmentMimeType(extension);
    const baseAttachment: ActivityCommentAttachment = {
      url: "",
      name: file.name,
      mimeType,
      extension,
      size: file.size,
    };
    const previewUrl = isImageAttachment(baseAttachment) ? URL.createObjectURL(file) : null;
    setPendingAttachment({
      file,
      previewUrl,
      attachment: { ...baseAttachment, url: previewUrl || "" },
    });
  };

  const downloadAttachment = useCallback(async (attachment: ActivityCommentAttachment) => {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      toast.success("File Downloaded", { description: attachment.name });
    } catch (error) {
      console.log("Failed to download activity comment attachment", error);
      toast.error("Download failed", { description: "The file could not be downloaded." });
    }
  }, []);

  const handleAttachmentClick = useCallback((attachment: ActivityCommentAttachment) => {
    if (isImageAttachment(attachment) || isPdfAttachment(attachment)) {
      setViewerAttachment(attachment);
      return;
    }
    void downloadAttachment(attachment);
  }, [downloadAttachment]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, ActivityComment[]>();
    comments.forEach((comment) => {
      const key = comment.parentId || null;
      map.set(key, [...(map.get(key) || []), comment]);
    });
    return map;
  }, [comments]);

  function renderBranch(comment: ActivityComment): React.ReactNode {
    return (
      <CommentRow
        key={comment.id}
        comment={comment}
        onReply={setReplyTo}
        deleting={deleteComment.isPending && deleteComment.variables?.id === comment.id}
        onDelete={(item) => deleteComment.mutate(item)}
        onView={handleView}
        onAttachmentClick={handleAttachmentClick}
      >
        {(childrenByParent.get(comment.id) || []).map(renderBranch)}
      </CommentRow>
    );
  }

  const submit = () => {
    const body = draft.trim();
    if ((!body && !pendingAttachment) || addComment.isPending) return;
    addComment.mutate({ body, parent: replyTo, pending: pendingAttachment });
  };

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm transition-all hover:border-cyan-700 hover:bg-cyan-950/20 hover:text-cyan-200"
        >
          <MessageCircle size={14} /> Comments ({totalCount})
          {unreadCount > 0 && (
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950 p-0 [&>button:first-child]:z-20 sm:max-w-[600px]">
        <SheetHeader className="relative overflow-hidden border-b border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 px-5 py-5 text-left sm:px-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex items-start gap-3.5 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-800/60 bg-cyan-950/60 text-cyan-300 shadow-[0_8px_30px_rgba(8,145,178,0.12)]">
              <MessagesSquare size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
                Activity discussion
              </SheetTitle>
              <SheetDescription className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400 sm:text-sm">
                {activity?.activity || "Activity"}
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-slate-300">
                  {totalCount} comment{totalCount === 1 ? "" : "s"}
                </span>
                {unreadCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-700/60 bg-cyan-950/60 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> {unreadCount} unread
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-900/70 bg-emerald-950/30 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                    All caught up
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.06),_transparent_35%)] px-4 py-5 sm:px-6">
          {commentsQuery.isLoading && (
            <div className="space-y-4" aria-label="Loading comments">
              {[0, 1, 2].map((item) => (
                <div key={item} className={cn("animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50 p-4", item === 1 && "ml-8")}>
                  <div className="mb-3 h-2 w-28 rounded bg-slate-800" />
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800" />
                    <div className="h-3 w-24 rounded bg-slate-800" />
                  </div>
                  <div className="mt-4 h-2.5 w-full rounded bg-slate-800/80" />
                  <div className="mt-2 h-2.5 w-3/5 rounded bg-slate-800/60" />
                </div>
              ))}
            </div>
          )}
          {commentsQuery.isError && (
            <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 text-center text-sm text-rose-300">
              <p>We couldn&apos;t load this discussion.</p>
              <button onClick={() => commentsQuery.refetch()} className="mt-2 rounded-lg border border-rose-800/60 px-3 py-1.5 text-xs font-medium transition hover:bg-rose-950/60">Try again</button>
            </div>
          )}
          {!commentsQuery.isLoading && !commentsQuery.isError && !comments.length && (
            <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 px-8 py-10 text-center shadow-inner">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-500">
                <MessagesSquare size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-300">Start the conversation</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Share an update, ask a question, or leave context for everyone working on this activity.</p>
            </div>
          )}
          {(childrenByParent.get(null) || []).map(renderBranch)}
        </div>

        <div className="border-t border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/90 p-4 shadow-[0_-12px_30px_rgba(2,6,23,0.45)] sm:px-6 sm:py-5">
          {replyTo && (
            <div className="mb-2.5 flex items-center justify-between rounded-xl border border-cyan-900/60 bg-cyan-950/25 px-3 py-2.5 text-xs text-cyan-200">
              <span className="flex min-w-0 items-center gap-2"><Reply size={13} className="shrink-0" /><span className="truncate">Replying to <strong>{replyTo.author.name}</strong></span></span>
              <button type="button" disabled={addComment.isPending} onClick={() => setReplyTo(null)} className="ml-2 rounded-md p-1 text-cyan-400 transition hover:bg-cyan-900/50 hover:text-cyan-200 disabled:opacity-50" aria-label="Cancel reply"><X size={14} /></button>
            </div>
          )}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-2 shadow-inner transition focus-within:border-cyan-700/70 focus-within:ring-2 focus-within:ring-cyan-500/10">
            {pendingAttachment && (
              <div className="px-2 pb-2 pt-1">
                <AttachmentTile
                  attachment={pendingAttachment.attachment}
                  disabled={addComment.isPending}
                  onRemove={() => setPendingAttachment(null)}
                />
              </div>
            )}
            <Textarea
              value={draft}
              disabled={addComment.isPending}
              maxLength={2000}
              rows={2}
              placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
              }}
              className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 px-1 pt-2">
              <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-600">
                <button
                  type="button"
                  disabled={addComment.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-50"
                  aria-label={pendingAttachment ? "Replace attachment" : "Attach a file"}
                  title={pendingAttachment ? "Replace attachment" : "Attach a file"}
                >
                  <Paperclip size={15} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACTIVITY_COMMENT_ATTACHMENT_ACCEPT}
                  disabled={addComment.isPending}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="shrink-0">{draft.length}/2000</span>
                <span className="hidden truncate sm:inline">Ctrl/⌘ + Enter to send</span>
              </div>
              <Button
                type="button"
                disabled={(!draft.trim() && !pendingAttachment) || addComment.isPending}
                onClick={submit}
                className="h-9 rounded-xl bg-cyan-700 px-3.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(8,145,178,0.2)] hover:bg-cyan-600 disabled:shadow-none"
                aria-label="Send comment"
              >
                {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <Dialog
      open={Boolean(viewerAttachment)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setViewerAttachment(null);
      }}
    >
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden border-slate-800 bg-slate-950 p-4 sm:p-6">
        {viewerAttachment && (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="truncate text-base text-slate-100" title={viewerAttachment.name}>
                {viewerAttachment.name}
              </DialogTitle>
              <DialogDescription>
                {isPdfAttachment(viewerAttachment) ? "PDF preview" : "Image preview"}
              </DialogDescription>
            </DialogHeader>
            {isImageAttachment(viewerAttachment) ? (
              <div className="relative h-[76vh] min-h-[240px] overflow-hidden rounded-xl bg-black/40">
                <Image
                  src={viewerAttachment.url}
                  alt={viewerAttachment.name}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            ) : (
              <iframe
                src={`${viewerAttachment.url}#toolbar=1&navpanes=0`}
                title={viewerAttachment.name}
                className="h-[76vh] min-h-[420px] w-full rounded-xl border border-slate-800 bg-white"
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
