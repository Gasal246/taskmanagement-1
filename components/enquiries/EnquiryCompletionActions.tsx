"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isCompleted } from "@/lib/enquiries/completion";
import { toast } from "sonner";

export function enquiryDate(value: any) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not available";
}
const userNames = (value: any) => (Array.isArray(value) ? value : [value]).filter(Boolean).map(u => u.name || u.email || "Unknown user").join(", ") || "Unassigned";
export default function EnquiryCompletionActions({ enquiry, basePath, showFollowup = true }: { enquiry: any; basePath: string; showFollowup?: boolean }) {
  const [mode, setMode] = useState<"followup" | "complete" | "reopen" | null>(null);
  const action = isCompleted(enquiry) && enquiry.completion_action ? enquiry.completion_action : enquiry.latest_forward?.action;
  return <>
    <div className="flex flex-wrap items-center gap-2">
      {showFollowup && <Button variant="outline" size="sm" onClick={() => setMode("followup")} className="gap-2 border-cyan-800/70 text-cyan-200 hover:bg-cyan-950"><Phone size={14} />Follow-up: {action || "Not recorded"}</Button>}
      {enquiry.completionEligible && <span className="inline-flex flex-col gap-1">
        <Button size="sm" disabled={!enquiry.canComplete} onClick={() => setMode("complete")} className="gap-2 bg-emerald-800 text-white hover:bg-emerald-700"><CheckCircle2 size={14} />Complete Enquiry</Button>
        {!enquiry.is_active && <span className="text-xs text-amber-300">Admin approval required</span>}
      </span>}
      {enquiry.canReopen && <Button variant="outline" size="sm" className="gap-2" onClick={() => setMode("reopen")}><RotateCcw size={14} />Reopen Enquiry</Button>}
    </div>
    <Dialog open={Boolean(mode)} onOpenChange={open => !open && setMode(null)}>
      {mode && <CompletionDialog key={mode} enquiryId={String(enquiry._id)} mode={mode} basePath={basePath} onClose={() => setMode(null)} />}
    </Dialog>
  </>;
}
function CompletionDialog({ enquiryId, mode, basePath, onClose }: { enquiryId: string; mode: "followup" | "complete" | "reopen"; basePath: string; onClose: () => void }) {
  const context = useQuery({ queryKey: ["completion-context", enquiryId], staleTime: 0, refetchOnWindowFocus: false, refetchOnMount: "always", queryFn: async () => {
    const response = await fetch(`/api/enquiries/update/enquiry/complete?enquiry_id=${encodeURIComponent(enquiryId)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load enquiry");
    return data.enquiry;
  } });
  return <DialogContent className="max-h-[90dvh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-xl">
    <DialogHeader><DialogTitle>{mode === "followup" ? "Latest follow-up" : mode === "reopen" ? "Reopen Enquiry" : "Complete Enquiry"}</DialogTitle><DialogDescription>{mode === "complete" ? "Review the last action and record how it was completed." : mode === "reopen" ? "Explain why this enquiry needs further follow-up." : "The latest forward action and completion record for this enquiry."}</DialogDescription></DialogHeader>
    {(context.isPending || context.isFetching) ? <p role="status">Loading latest enquiry…</p> : context.isError ? <div role="alert"><p>{context.error.message}</p><Button onClick={() => context.refetch()}>Try again</Button></div> : <CompletionForm enquiry={context.data} mode={mode} basePath={basePath} onClose={onClose} />}
  </DialogContent>;
}
function CompletionForm({ enquiry, mode, basePath, onClose }: { enquiry: any; mode: "followup" | "complete" | "reopen"; basePath: string; onClose: () => void }) {
  const forward = enquiry.latest_forward;
  const [action, setAction] = useState(["Call", "Visit"].includes(forward?.action) ? forward.action : "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const allowed = mode === "reopen" ? enquiry.canReopen : enquiry.canComplete;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/enquiries/update/enquiry/${mode === "reopen" ? "reopen" : "complete"}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enquiry_id: enquiry._id, action, notes, source_forward_id: forward?._id ?? null, expected_updated_at: enquiry.updatedAt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save enquiry");
      await queryClient.invalidateQueries({ predicate: q => ["enquiries", "enquiry", "histories", "history", "action", "completion-context"].includes(String(q.queryKey[0])) });
      toast.success(result.message); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save enquiry"); }
    finally { setSaving(false); }
  };
  return <form onSubmit={save} className="space-y-4">
    {mode !== "reopen" && <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
      {forward ? <><p className="font-semibold text-cyan-200">Follow-up: {forward.action || "Not recorded"}</p><p>Assigned to: {userNames(forward.assigned_to)}</p><p>Forwarded by: {userNames(forward.forwarded_by)}</p><p>Date: {enquiryDate(forward.createdAt)}</p><p className="whitespace-pre-wrap break-words text-slate-300">Previous notes: {forward.feedback || "No notes recorded"}</p></> : <p className="text-slate-400">No forward action has been recorded.{mode === "complete" ? " Select the action you completed below." : ""}</p>}
    </div>}
    {isCompleted(enquiry) && <div className="space-y-1 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-4 text-sm">
      <p className="font-semibold text-emerald-200">Enquiry completed{enquiry.completion_action ? ` · ${enquiry.completion_action}` : ""}</p>
      <p>Completed by: {enquiry.completed_by ? userNames(enquiry.completed_by) : "Not recorded"}</p>
      <p>{enquiryDate(enquiry.completed_at || enquiry.updatedAt)}{enquiry.completion_date_estimated ? " · Estimated completion date" : ""}</p>
      {enquiry.completion_notes && <p className="whitespace-pre-wrap break-words">{enquiry.completion_notes}</p>}
    </div>}
    {mode !== "followup" && <>
      {!allowed && <p role="alert" className="text-amber-300">{!enquiry.is_active && mode === "complete" ? "Admin approval is required before completion." : "This enquiry is no longer eligible for this action."}</p>}
      {mode === "complete" && <label className="block space-y-2 text-sm"><span>Completed action</span><select aria-label="Completed action" required value={action} onChange={e => setAction(e.target.value)} disabled={saving || !allowed} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"><option value="">Select an action</option><option>Call</option><option>Visit</option></select></label>}
      <label className="block space-y-2 text-sm"><span>{mode === "reopen" ? "Reason for reopening" : "Completion notes"}</span><textarea aria-label={mode === "reopen" ? "Reason for reopening" : "Completion notes"} required maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} disabled={saving || !allowed} rows={4} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" placeholder={mode === "reopen" ? "Why does this enquiry need more work?" : "Describe the completed action and outcome…"} /></label>
    </>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <DialogFooter className="gap-2"><Button variant="outline" type="button" asChild><Link href={`${basePath}/${enquiry._id}/history`}>View history</Link></Button><Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Close</Button>{mode !== "followup" && <Button type="submit" disabled={!allowed || saving || !notes.trim() || (mode === "complete" && !action)}>{saving ? "Saving…" : mode === "reopen" ? "Reopen Enquiry" : "Complete Enquiry"}</Button>}</DialogFooter>
  </form>;
}
