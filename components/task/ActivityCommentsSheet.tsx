"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Avatar, Popconfirm } from "antd";
import { Loader2, MessageCircle, MessagesSquare, Reply, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ActivityComment = {
  id: string;
  activityId: string;
  taskId: string;
  parentId: string | null;
  rootId: string | null;
  depth: number;
  body: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isSeen: boolean;
  canDelete: boolean;
  author: { id: string; name: string; avatarUrl: string };
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

function CommentRow({
  comment,
  children,
  onReply,
  onDelete,
  onView,
  deleting,
}: {
  comment: ActivityComment;
  children: React.ReactNode;
  onReply: (comment: ActivityComment) => void;
  onDelete: (comment: ActivityComment) => void;
  onView: (id: string) => void;
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
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
              {comment.body}
            </p>
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
                <Popconfirm
                  title="Delete this comment?"
                  description="Replies will remain visible."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(comment)}
                >
                  <button
                    type="button"
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-slate-500 transition hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                  </button>
                </Popconfirm>
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
  const [unreadCount, setUnreadCount] = useState(Number(activity?.unread_comment_count || 0));
  const [totalCount, setTotalCount] = useState(Number(activity?.comment_count || 0));
  const pendingSeen = useRef(new Set<string>());
  const seenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setUnreadCount(Number(activity?.unread_comment_count || 0)), [activity?.unread_comment_count]);
  useEffect(() => setTotalCount(Number(activity?.comment_count || 0)), [activity?.comment_count]);
  useEffect(() => {
    if (initiallyOpen) setOpen(true);
  }, [initiallyOpen]);

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
    mutationFn: (variables: { body: string; parent: ActivityComment | null }) =>
      requestJson(`/api/task/activities/${activityId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: variables.body, parentId: variables.parent?.id || null }),
      }),
    onMutate: async ({ body, parent }) => {
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
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSeen: true,
        canDelete: false,
        author: { id: session?.user?.id || "me", name: "You", avatarUrl: "" },
      };
      queryClient.setQueryData<CommentsResponse>(queryKey, (old) => ({ comments: [...(old?.comments || []), temp] }));
      setDraft("");
      setReplyTo(null);
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
          ? { ...item, body: "", deletedAt: new Date().toISOString(), canDelete: false, isSeen: true }
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
      >
        {(childrenByParent.get(comment.id) || []).map(renderBranch)}
      </CommentRow>
    );
  }

  const submit = () => {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate({ body, parent: replyTo });
  };

  return (
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
              <button type="button" onClick={() => setReplyTo(null)} className="ml-2 rounded-md p-1 text-cyan-400 transition hover:bg-cyan-900/50 hover:text-cyan-200" aria-label="Cancel reply"><X size={14} /></button>
            </div>
          )}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-2 shadow-inner transition focus-within:border-cyan-700/70 focus-within:ring-2 focus-within:ring-cyan-500/10">
            <Textarea
              value={draft}
              maxLength={2000}
              rows={2}
              placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
              }}
              className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between border-t border-slate-800/80 px-1 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-slate-600">
                <span>{draft.length}/2000</span>
                <span className="hidden sm:inline">Ctrl/⌘ + Enter to send</span>
              </div>
              <Button
                type="button"
                disabled={!draft.trim() || addComment.isPending}
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
  );
}
