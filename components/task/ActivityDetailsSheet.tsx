"use client";

import { ReactNode, useRef } from "react";
import { CalendarDays, CheckCircle2, Circle, UserRound, Users } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import ActivityDocuments from "./ActivityDocuments";
import { formatScheduleDate } from "@/lib/activity-schedule";

const idOf = (person: any) => String(person?._id || person?.id || person || "");

export default function ActivityDetailsSheet({ activity, taskId, currentUserId, taskCreator, onClose, actions }: {
  activity: any;
  taskId: string;
  currentUserId?: string;
  taskCreator?: any;
  onClose: () => void;
  actions: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const people: any[] = Array.from(new Map((activity?.assignees || [])
    .filter((person: any) => idOf(person))
    .map((person: any) => [idOf(person), person])).values());
  const assignedToViewer = people.some(person => idOf(person) === currentUserId);
  const latestAssignment = [...(activity?.reassignment_history || [])]
    .filter(event => event.action !== "removed" && (assignedToViewer
      ? idOf(event.recipient_id) === currentUserId
      : people.some(person => idOf(person) === idOf(event.recipient_id))))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const assigner = latestAssignment?.actor_id || activity?.created_by || taskCreator;

  return <Sheet open={Boolean(activity)} onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={event => {
        if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
      }} className="flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 overflow-hidden border-slate-800 bg-slate-950 p-0 text-slate-100 sm:max-w-[620px] [&>button]:z-20 [&>button]:text-slate-300">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-5 pr-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Activity details</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${activity?.is_done ? "border-emerald-700/50 bg-emerald-950/50 text-emerald-300" : "border-cyan-700/50 bg-cyan-950/50 text-cyan-200"}`}>
          {activity?.is_done ? <CheckCircle2 size={13} /> : <Circle size={13} />}{activity?.is_done ? "Completed" : "Pending"}
        </span>
      </div>
      <SheetDescription className="sr-only">View the assignment, schedule, attachments and people for this activity. Actions are available in the footer.</SheetDescription>
      <div data-activity-detail-body className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6">
        <div className="space-y-4 rounded-xl border border-cyan-900/50 bg-gradient-to-br from-cyan-950/30 to-slate-900/40 p-4">
          <div className="flex items-start gap-3"><span className="rounded-full bg-cyan-900/40 p-2 text-cyan-300"><UserRound size={18} /></span><div className="min-w-0"><p className="text-xs text-slate-400">Assigned by</p><p className="break-words text-sm font-semibold">{assigner?.name || "Not recorded"}</p>{latestAssignment?.recipient_id?.name && <p className="mt-1 break-words text-xs text-slate-400">To {latestAssignment.recipient_id.name}</p>}</div></div>
          <div className="grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
            {[["Starts", activity?.start_date], ["Due", activity?.end_date]].map(([label, date]) => <div key={label} className="flex gap-2"><CalendarDays size={15} className="mt-0.5 shrink-0 text-cyan-400" /><div><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs text-slate-200">{formatScheduleDate(date)}</p></div></div>)}
          </div>
        </div>
        <div className="space-y-3"><SheetTitle className="whitespace-pre-wrap break-words text-2xl font-bold leading-tight text-slate-100">{activity?.activity || "Untitled activity"}</SheetTitle><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{activity?.description || "No description added."}</p></div>
        <ActivityDocuments taskId={taskId} documents={activity?.documents || []} editable={false} onChange={() => {}} />
        <section className="space-y-3" aria-label="Activity people">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Users size={16} className="text-cyan-400" />People <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">{people.length}</span></h3>
          {people.length ? <div className="grid gap-2 sm:grid-cols-2">{people.map(person => <div key={idOf(person)} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-950 font-semibold text-cyan-200">{(person?.name || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="break-words text-sm font-medium">{person?.name || "Unknown person"}{idOf(person) === currentUserId && <span className="ml-1 text-xs text-cyan-400">(you)</span>}</p>{person?.email && <p className="break-all text-xs text-slate-500">{person.email}</p>}</div></div>)}</div> : <p className="text-sm text-slate-500">No one assigned yet.</p>}
        </section>
      </div>
      <div data-activity-detail-footer className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">{actions}</div>
    </SheetContent>
  </Sheet>;
}
