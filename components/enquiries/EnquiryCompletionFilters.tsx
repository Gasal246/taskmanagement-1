"use client";
import { periodBounds } from "@/lib/enquiries/period";
export const completionFilterDefaults = { completion_state: "all", period_preset: "all", period_from: "", period_to: "", period_start: "", period_end: "" };
export default function EnquiryCompletionFilters({ filters, onChange }: { filters: Record<string, string>; onChange: (changes: Record<string, string>) => void }) {
  const changePeriod = (preset: string, start = filters.period_start, end = filters.period_end) => onChange({ period_preset: preset, period_start: start || "", period_end: end || "", ...periodBounds(preset, start, end) });
  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500";
  return <div className="my-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-40 flex-1 space-y-1 text-xs text-slate-400"><span>Completion</span><select className={inputClass} value={filters.completion_state || "all"} onChange={e => onChange({ completion_state: e.target.value })}><option value="all">All enquiries</option><option value="completed">Completed</option><option value="non_completed">Non-completed</option></select></label>
      <label className="min-w-40 flex-1 space-y-1 text-xs text-slate-400"><span>Period</span><select className={inputClass} value={filters.period_preset || "all"} onChange={e => changePeriod(e.target.value)}><option value="all">All time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>
      {filters.period_preset === "custom" && <><label className="space-y-1 text-xs text-slate-400"><span>From</span><input aria-label="Period start" type="date" className={inputClass} value={filters.period_start || ""} max={filters.period_end || undefined} onChange={e => changePeriod("custom", e.target.value, filters.period_end)} /></label><label className="space-y-1 text-xs text-slate-400"><span>Through</span><input aria-label="Period end" type="date" className={inputClass} value={filters.period_end || ""} min={filters.period_start || undefined} onChange={e => changePeriod("custom", filters.period_start, e.target.value)} /></label></>}
      {((filters.completion_state || "all") !== "all" || (filters.period_preset || "all") !== "all") && <button type="button" className="rounded-lg px-3 py-2 text-xs text-cyan-300 hover:bg-slate-800" onClick={() => onChange(completionFilterDefaults)}>Reset completion filters</button>}
    </div>
    <p className="mt-2 text-xs text-slate-400">Completed: completion date. Non-completed: recent update date. Older records may use an estimated completion date.</p>
  </div>;
}
