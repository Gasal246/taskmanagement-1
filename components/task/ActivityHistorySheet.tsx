"use client";

import { useMemo } from "react";
import { Avatar } from "antd";
import { History } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buildActivityHistory } from "@/lib/activity-history";
import { formatScheduleDate } from "@/lib/activity-schedule";

export default function ActivityHistorySheet({ activity, creator, open, onOpenChange }: {
  activity: any; creator: any; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const entries = useMemo(() => buildActivityHistory(activity, creator), [activity, creator]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950 p-0 sm:max-w-[620px]">
        <SheetHeader className="shrink-0 border-b border-slate-800 px-6 py-5 pr-16 text-left">
          <SheetTitle className="flex items-center gap-2 text-slate-100"><History size={20} /> Activity History</SheetTitle>
          <SheetDescription className="text-slate-400">{activity?.activity || "Activity"} · {entries.length} {entries.length === 1 ? "entry" : "entries"}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {!entries.length && <p className="py-12 text-center text-sm text-slate-400">No activity history yet.</p>}
          <ol className="space-y-5">
            {entries.map(entry => (
              <li key={entry._id} className="rounded-xl border border-cyan-900/60 bg-gradient-to-br from-cyan-950/30 to-slate-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-cyan-200">{entry.event_label}</p>
                  <time className="text-xs text-slate-400" dateTime={entry.createdAt ? new Date(entry.createdAt).toISOString() : undefined}>
                    {entry.createdAt ? formatScheduleDate(entry.createdAt) : "Date unavailable"}
                  </time>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar src={entry.event_user?.avatar_url || "/avatar.png"} size={36} />
                  <div className="min-w-0">
                    <p className="break-words text-sm text-slate-100">{entry.event_type === "schedule" ? "Changed by " : ""}{entry.event_user?.name || "Unknown staff"}</p>
                    {entry.event_user?.email && <p className="break-all text-xs text-slate-400">{entry.event_user.email}</p>}
                  </div>
                </div>
                {entry.event_type === "schedule" && (
                  <div className="mt-4 space-y-3 border-t border-slate-800 pt-3 text-sm">
                    <Period label="Previous period" start={entry.previous_start_date} end={entry.previous_end_date} />
                    <Period label="New period" start={entry.new_start_date} end={entry.new_end_date} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Period({ label, start, end }: { label: string; start: string | Date | null; end: string | Date | null }) {
  return <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-slate-300">Start: {formatScheduleDate(start)}</p>
    <p className="text-slate-300">End: {formatScheduleDate(end)}</p>
  </div>;
}
