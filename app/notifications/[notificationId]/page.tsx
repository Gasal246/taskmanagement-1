"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { updateNotification } from "@/lib/notifications/client";
export default function NotificationDetail() {
  const { data: session, status } = useSession();
  const { notificationId } = useParams<{ notificationId: string }>();
  const [error, setError] = useState(""); const [unread, setUnread] = useState(false); const marked = useRef("");
  const query = useQuery({ queryKey: ["notification-detail", session?.user?.id, notificationId], enabled: Boolean(session?.user?.id), retry: false, queryFn: async () => {
    const response = await fetch(`/api/notifications/${notificationId}`, { cache: "no-store" }); const data = await response.json();
    if (!response.ok) throw new Error(data.message); return data;
  } });
  useEffect(() => {
    if (!query.data || marked.current === notificationId) return;
    marked.current = notificationId;
    updateNotification({ ids: [notificationId], operation: "read" }).catch(error => { marked.current = ""; setError(error.message); });
  }, [query.data, notificationId]);
  const item = query.data?.notification;
  return <main className="mx-auto max-w-2xl space-y-5 p-6 pt-12">
    {status === "unauthenticated" && <Link href={`/signin?callbackUrl=${encodeURIComponent(`/notifications/${notificationId}`)}`}>Sign in to open this notification</Link>}
    {query.isLoading && <p>Loading notification…</p>}
    {query.error && <div role="alert" className="space-y-3"><p>{query.error.message}</p><Button onClick={() => query.refetch()}>Retry</Button><Link href={`/signin?callbackUrl=${encodeURIComponent(`/notifications/${notificationId}`)}`} className="ml-4 underline">Sign in</Link></div>}
    {item && <><p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} · {item.kind}</p><h1 className="text-xl font-semibold">{item.title}</h1><p className="whitespace-pre-wrap break-words text-slate-300">{item.body}</p>
      {item.sender?.name && <p className="text-sm text-slate-400">From {item.sender.name}</p>}
      <div className="flex flex-wrap gap-3">{query.data.target && <Button asChild><a href={query.data.target}>Open related item</a></Button>}<Button variant="outline" disabled={unread} onClick={async () => { try { await updateNotification({ ids: [notificationId], operation: "unread" }); setUnread(true); } catch (error: any) { setError(error.message); } }}>{unread ? "Marked unread" : "Mark unread"}</Button><Button variant="ghost" onClick={() => window.history.back()}>Back</Button></div>
      {item.actionRequired && <p className="text-xs text-amber-200">Reading this notification does not complete the requested action.</p>}</>}
    {error && <p role="alert" className="text-red-300">{error} <button className="underline" onClick={async () => { try { await updateNotification({ ids: [notificationId], operation: "read" }); setError(""); } catch {} }}>Retry saving read status</button></p>}
  </main>;
}
