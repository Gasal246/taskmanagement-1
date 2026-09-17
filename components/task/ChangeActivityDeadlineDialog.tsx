"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatScheduleDate, toLocalDateTimeInput } from "@/lib/activity-schedule";
import { getScheduleChange, scheduleTimestamp } from "@/lib/activity-deadline";
import { useChangeActivityDeadline } from "@/query/business/queries";

export default function ChangeActivityDeadlineDialog({ activity, onChanged }: {
  activity: any;
  onChanged?: (period: { start_date: string; end_date: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [endValue, setEndValue] = useState("");
  const [error, setError] = useState("");
  const change = useChangeActivityDeadline();
  if (!activity.canEditSchedule) return null;
  const unavailable = activity.is_done ? "Reopen this activity before changing its deadline." :
    (!activity.start_date || !activity.end_date) ? "Set its schedule through Edit Activity first." : "";
  const newEnd = endValue && Number.isFinite(new Date(endValue).getTime()) ? new Date(endValue).toISOString() : null;
  const preview = snapshot ? getScheduleChange(snapshot, { start_date: snapshot.start_date, end_date: newEnd }) : null;
  const unchanged = scheduleTimestamp(newEnd) === scheduleTimestamp(snapshot?.end_date);
  const label = newEnd && snapshot?.end_date && new Date(newEnd) < new Date(snapshot.end_date) ? "Shorten Deadline" : "Extend Deadline";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = getScheduleChange(snapshot, { start_date: snapshot.start_date, end_date: newEnd });
    if (validation.error || !validation.action) { setError(validation.error || "Choose a different deadline"); return; }
    setError("");
    try {
      await change.mutateAsync({
        activity_id: activity._id,
        end_date: newEnd!,
        expected_start_date: snapshot.start_date,
        expected_end_date: snapshot.end_date,
      });
      onChanged?.({ start_date: snapshot.start_date, end_date: newEnd! });
      toast.success(validation.action === "deadline_shortened" ? "Deadline shortened" : "Deadline extended");
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to change the deadline. Please try again.");
    }
  };

  return <>
    <span title={unavailable || undefined}>
      <Button type="button" variant="outline" size="sm" disabled={Boolean(unavailable)} onClick={() => {
        setSnapshot({ ...activity }); setEndValue(toLocalDateTimeInput(activity.end_date)); setError(""); setOpen(true);
      }}><Clock3 size={12} className="mr-1" /> Change Deadline</Button>
      {unavailable && <span className="mt-1 block max-w-60 text-xs text-slate-500">{unavailable}</span>}
    </span>
    <Dialog open={open} onOpenChange={value => { if (!change.isPending) setOpen(value); }}>
      <DialogContent className="border-slate-800 bg-slate-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Deadline</DialogTitle>
          <DialogDescription>{activity.activity}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg border border-slate-800 p-3 text-sm text-slate-300">
            <p className="mb-1 font-medium">Current period</p>
            <p>Start: {formatScheduleDate(snapshot?.start_date)}</p>
            <p>End: {formatScheduleDate(snapshot?.end_date)}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor={`deadline-${activity._id}`} className="text-sm font-medium">New end date and time</label>
            <Input id={`deadline-${activity._id}`} type="datetime-local" step="0.001" value={endValue} onChange={event => { setEndValue(event.target.value); setError(""); }} disabled={change.isPending} required />
            <p className="text-xs text-slate-400">Times use your local timezone. The new deadline must be in the future.</p>
          </div>
          {newEnd && <div className="rounded-lg border border-cyan-900 p-3 text-sm text-slate-300">
            <p className="mb-1 font-medium">New period</p>
            <p>Start: {formatScheduleDate(snapshot?.start_date)}</p>
            <p>End: {formatScheduleDate(newEnd)}</p>
          </div>}
          {(error || (!unchanged && preview?.error)) && <p role="alert" className="text-sm text-red-400">{error || preview?.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={change.isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={change.isPending || unchanged || !newEnd || Boolean(preview?.error)}>{change.isPending ? "Saving..." : label}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
