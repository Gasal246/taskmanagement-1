"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  CheckCheck, CircleAlert, Clock3, Inbox, ListTodo, Loader2, Mail,
  MessageSquare, RefreshCw, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationPane from "@/components/shared/NotificationPane";
import { updateNotification } from "@/lib/notifications/client";

const categories: Record<string, { label: string; icon: typeof Bell }> = {
  task: { label: "Task update", icon: ListTodo },
  "task-activity": { label: "Activity update", icon: ListTodo },
  "task-activity-comment": { label: "Activity comment", icon: MessageSquare },
  enquiry: { label: "Enquiry update", icon: BriefcaseBusiness },
  "head-office-request": { label: "Head office approval", icon: ShieldCheck },
  calendar: { label: "Calendar update", icon: CalendarDays },
  test: { label: "Notification test", icon: Bell },
  custom_test_push: { label: "Message", icon: MessageSquare },
};

export default function NotificationDetail() {
  const { data: session, status } = useSession();
  const { notificationId } = useParams<{ notificationId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const marked = useRef("");
  const viewKey = `${session?.user?.id}:${notificationId}`;
  const query = useQuery({
    queryKey: ["notification-detail", session?.user?.id, notificationId],
    enabled: Boolean(session?.user?.id),
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/notifications/${notificationId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load this notification");
      return data;
    },
  });

  useEffect(() => {
    if (!query.data || marked.current === viewKey) return;
    marked.current = viewKey;
    setUnread(false); setError(""); setSaved(false); setSaving(true);
    updateNotification({ ids: [notificationId], operation: "read" })
      .then(() => { if (marked.current === viewKey) setSaved(true); })
      .catch(error => { if (marked.current === viewKey) setError(error.message); })
      .finally(() => { if (marked.current === viewKey) setSaving(false); });
  }, [query.data, notificationId, viewKey]);

  const setReadState = async (read: boolean) => {
    setSaving(true); setError("");
    try {
      await updateNotification({ ids: [notificationId], operation: read ? "read" : "unread" });
      setUnread(!read); setSaved(read);
    } catch (error: any) { setError(error.message || "Unable to save notification status"); }
    finally { setSaving(false); }
  };

  const item = query.data?.notification;
  const category = categories[item?.kind] || {
    label: /project|account-manager|site-operational-head/.test(item?.kind || "") ? "Project update" : "Notification",
    icon: Bell,
  };
  const CategoryIcon = category.icon;
  const sender = item?.sender?.name || item?.sender?.email || "Task Manager";
  const initials = sender.split(/\s+/).slice(0, 2).map((word: string) => word[0]).join("").toUpperCase();
  const date = item ? new Date(item.createdAt) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const read = !unread && (saved || Boolean(item?.readAt));
  const metadata = { ...item?.meta, ...item?.data };
  const context = [
    { label: "Task", value: metadata.taskName },
    { label: "Activity", value: metadata.activityTitle },
    { label: "Project", value: metadata.projectName },
    { label: "Enquiry", value: metadata.enquiryUuid },
  ].filter(row => typeof row.value === "string" && row.value.trim());
  const signInUrl = `/signin?callbackUrl=${encodeURIComponent(`/notifications/${notificationId}`)}`;
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.replace("/");
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"><Bell size={19} aria-hidden="true" /></span>
            <span><span className="block text-sm font-semibold">Task Manager</span><span className="block text-xs text-slate-400">Notifications</span></span>
          </Link>
          {session?.user?.id && <NotificationPane trigger={<Button variant="outline" className="shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"><Inbox aria-hidden="true" /> Inbox</Button>} />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
        <Button variant="ghost" onClick={goBack} className="mb-5 -ml-3 text-slate-400 hover:bg-slate-900 hover:text-white"><ArrowLeft aria-hidden="true" /> Back</Button>

        {(status === "loading" || query.isLoading) && (
          <section aria-label="Loading notification" aria-busy="true" className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-800" />
            <div className="h-7 w-2/3 animate-pulse rounded bg-slate-800" />
            <div className="space-y-3"><div className="h-4 w-full animate-pulse rounded bg-slate-800" /><div className="h-4 w-4/5 animate-pulse rounded bg-slate-800" /></div>
            <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your notification…</p>
          </section>
        )}

        {status === "unauthenticated" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <ShieldCheck className="mb-5 h-9 w-9 text-cyan-300" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Your notification is waiting</h1>
            <p className="mb-6 mt-2 text-sm leading-6 text-slate-400">Sign in to your account to view this message.</p>
            <Button asChild><Link href={signInUrl}>Sign in <ArrowUpRight aria-hidden="true" /></Link></Button>
          </section>
        )}

        {query.error && (
          <section role="alert" className="rounded-2xl border border-rose-900/50 bg-slate-900/60 p-6 sm:p-8">
            <CircleAlert className="mb-5 h-9 w-9 text-rose-300" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Unable to open notification</h1>
            <p className="mb-6 mt-2 break-words text-sm leading-6 text-slate-400">{query.error.message}</p>
            <div className="flex flex-wrap gap-3"><Button onClick={() => query.refetch()}><RefreshCw aria-hidden="true" /> Try again</Button><Button asChild variant="outline"><Link href={signInUrl}>Sign in</Link></Button></div>
          </section>
        )}

        {item && (
          <>
            <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/20 [overflow-wrap:anywhere]">
              <div className="h-1 bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500" />
              <div className="p-5 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"><CategoryIcon size={20} aria-hidden="true" /></span>
                    <span className="text-xs font-medium tracking-wide text-cyan-200">{category.label}</span>
                  </div>
                  <span role="status" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${read ? "border-slate-700 bg-slate-800/70 text-slate-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"}`}>
                    {saving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : read ? <CheckCheck size={13} aria-hidden="true" /> : <Mail size={13} aria-hidden="true" />}
                    {saving ? "Saving…" : read ? "Read" : "Unread"}
                  </span>
                </div>
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{item.title}</h1>
                {validDate && <time dateTime={validDate.toISOString()} className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={13} className="shrink-0" aria-hidden="true" />{validDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} · {validDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time>}

                <div className="mt-7 border-t border-slate-800 pt-6">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">{item.body || "Open the related item to see more details."}</p>
                  {context.length > 0 && <dl className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2">{context.map(row => <div key={row.label} className="min-w-0"><dt className="text-xs text-slate-500">{row.label}</dt><dd className="mt-1 text-sm text-slate-200">{row.value}</dd></div>)}</dl>}
                </div>

                <div className="mt-7 flex items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300">{initials}</span>
                  <div className="min-w-0"><p className="text-xs text-slate-500">Sent by</p><p className="mt-0.5 text-sm font-medium text-slate-200">{sender}</p></div>
                </div>

                {item.actionRequired && <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><CircleAlert size={17} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" /><div><p className="text-sm font-medium text-amber-200">This update needs your attention</p><p className="mt-1 text-xs leading-5 text-slate-400">Open the related item to review the requested action. Reading this message does not complete it.</p></div></div>}
              </div>

              <footer className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                {query.data.target && <Button asChild className="h-10 bg-cyan-400 text-slate-950 hover:bg-cyan-300"><Link href={query.data.target}>Open related item <ArrowUpRight aria-hidden="true" /></Link></Button>}
                <Button variant="outline" disabled={saving || unread} onClick={() => setReadState(false)} className="h-10 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 sm:ml-auto"><Mail aria-hidden="true" />{unread ? "Marked as unread" : "Mark as unread"}</Button>
              </footer>
            </article>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">{unread ? "Saved as unread. You can return to it from your inbox." : "Read notifications stay in your inbox for 30 days."}</p>
          </>
        )}

        {error && <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="break-words text-sm text-rose-200">{error}</p><Button variant="outline" disabled={saving} onClick={() => setReadState(true)} className="shrink-0"><RefreshCw aria-hidden="true" /> Retry saving read status</Button></div>}
      </main>
    </div>
  );
}
