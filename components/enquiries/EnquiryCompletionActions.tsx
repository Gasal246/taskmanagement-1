"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { actionProgress, idOf } from '@/lib/enquiries/completion';

export function enquiryDate(value: any) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(+date) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not available';
}
const userName = (user: any) => user?.name || user?.email || 'Unknown user';
const statusLabel = (action: any) => {
  const progress = action.progress || actionProgress(action);
  return progress.overdue ? 'Overdue' : progress.status === 'resolved' ? 'Resolved with cancellations' : progress.status === 'completed' ? 'Completed' : progress.status === 'cancelled' ? 'Cancelled' : 'Pending';
};
export default function EnquiryCompletionActions({ enquiry, basePath, showFollowup = true }: { enquiry: any; basePath: string; showFollowup?: boolean }) {
  const [open, setOpen] = useState(false);
  const latest = enquiry.latest_action;
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 border-cyan-800/70 text-cyan-200 hover:bg-cyan-950">
        <Phone size={14} />{showFollowup ? `Follow-up: ${latest?.action || 'Not recorded'}${latest ? ` · ${statusLabel(latest)}` : ''}` : 'Manage action assignments'}
      </Button>
      {enquiry.pending_action_parts > 0 && <span className="text-xs text-amber-200">{enquiry.pending_action_parts} pending assignment{enquiry.pending_action_parts === 1 ? '' : 's'}</span>}
    </div>
    {enquiry.last_completed_action && <p className="mt-2 text-xs text-slate-400">Last completed: {enquiry.last_completed_action.action} · {enquiryDate(enquiry.last_completed_action.completed_at)} · {userName(enquiry.last_completed_action.user_id)}</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      {open && <ActionsDialog enquiryId={idOf(enquiry)} basePath={basePath} onClose={() => setOpen(false)} />}
    </Dialog>
  </>;
}
function ActionsDialog({ enquiryId, basePath, onClose }: { enquiryId: string; basePath: string; onClose: () => void }) {
  const context = useQuery({ queryKey: ['enquiry-actions', enquiryId], staleTime: 0, refetchOnWindowFocus: false, refetchOnMount: 'always', queryFn: async () => {
    const response = await fetch(`/api/enquiries/actions?enquiry_id=${encodeURIComponent(enquiryId)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load actions');
    return data.enquiry;
  } });
  return <DialogContent className="max-h-[90dvh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-2xl">
    <DialogHeader><DialogTitle>Enquiry actions</DialogTitle><DialogDescription>Each assignee completes their own part. Earlier pending actions remain available when a new action is scheduled.</DialogDescription></DialogHeader>
    {context.isPending ? <p role="status">Loading actions…</p> : context.isError ? <div role="alert"><p>{context.error.message}</p><Button onClick={() => context.refetch()}>Try again</Button></div> : <ActionsContent enquiry={context.data} basePath={basePath} onClose={onClose} />}
  </DialogContent>;
}
function ActionsContent({ enquiry, basePath, onClose }: { enquiry: any; basePath: string; onClose: () => void }) {
  const router = useRouter();
  const client = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<{ action: any; part: any; operation: string } | null>(null);
  const [performed, setPerformed] = useState('Call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recordId, setRecordId] = useState('');
  const actions = (enquiry.actions || []).filter((a: any) => filter === 'all' || a.action_assignments.some((p: any) => p.status === filter));
  const choose = (action: any, part: any, operation: string) => {
    setSelected({ action, part, operation }); setPerformed(action?.action || 'Call'); setNotes(''); setError('');
    // Reused on retries so a lost response cannot create a duplicate unscheduled record.
    if (operation === 'record') setRecordId(crypto.randomUUID().replaceAll('-', '').slice(0, 24));
  };
  const save = async (scheduleNext = false) => {
    if (!selected || saving || !notes.trim()) return;
    setSaving(true); setError('');
    try {
      const record = selected.operation === 'record';
      const response = await fetch('/api/enquiries/actions', {
        method: record ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enquiry_id: enquiry._id, action_id: selected.action?._id,
          assignee_id: idOf(selected.part?.user_id), expected_revision: selected.part?.revision || 0,
          operation: selected.operation, performed_action: performed, notes, request_id: recordId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update action');
      await client.invalidateQueries({ predicate: q => ['enquiries', 'enquiry', 'histories', 'history', 'action', 'enquiry-actions', 'user_logs'].includes(String(q.queryKey[0])) });
      toast.success(result.message); setSelected(null);
      if (scheduleNext) { onClose(); router.push(`${basePath}/${enquiry._id}/forward-enquiry`); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update action'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-4">
    {!enquiry.is_active && <p className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200">Admin approval is required before completing or scheduling actions.</p>}
    {selected ? <div className="space-y-3 rounded-xl border border-slate-700 p-4">
      <h3 className="font-semibold">{selected.operation === 'record' ? 'Record completed action' : selected.operation === 'complete' ? 'Complete my action' : selected.operation === 'cancel' ? 'Cancel assignment' : 'Reopen assignment'}</h3>
      {selected.action && <div className="space-y-1 text-sm text-slate-300"><p>Planned: {selected.action.action} · Due: {enquiryDate(selected.action.next_step_date)}</p><p>Assignee: {userName(selected.part.user_id)}</p><p className="whitespace-pre-wrap break-words">Previous notes: {selected.action.feedback || 'None'}</p></div>}
      {['complete', 'record'].includes(selected.operation) && <label className="block space-y-1 text-sm">Performed action<select aria-label="Performed action" value={performed} onChange={e => setPerformed(e.target.value)} disabled={saving} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2"><option>Call</option><option>Visit</option></select></label>}
      <label className="block space-y-1 text-sm">{['complete', 'record'].includes(selected.operation) ? 'Completion notes' : 'Reason'}<textarea aria-label="Action notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={saving} maxLength={5000} rows={4} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={saving || !notes.trim()} onClick={() => save()}>{saving ? 'Saving…' : 'Save action'}</Button>{['complete', 'record'].includes(selected.operation) && enquiry.canScheduleAction && <Button variant="outline" disabled={saving || !notes.trim()} onClick={() => save(true)}>Complete & schedule next</Button>}<Button variant="ghost" disabled={saving} onClick={() => setSelected(null)}>Back to actions</Button></div>
    </div> : <>
      <div className="flex flex-wrap items-center gap-2"><label className="text-sm">Show <select aria-label="Action list status" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 p-2"><option value="all">All actions</option><option value="pending">Pending parts</option><option value="completed">Completed parts</option><option value="cancelled">Cancelled parts</option></select></label>{enquiry.canScheduleAction && <Button size="sm" asChild><Link href={`${basePath}/${enquiry._id}/forward-enquiry`}>Schedule another action</Link></Button>}{enquiry.canRecordAction && <Button variant="outline" size="sm" onClick={() => choose(null, null, 'record')}>Record completed action</Button>}</div>
      {!actions.length && <p className="text-sm text-slate-400">{enquiry.actions?.length ? 'No actions match this selection.' : 'No action has been recorded. Schedule a follow-up or record an action you have already performed.'}</p>}
      {actions.map((action: any) => <article key={idOf(action)} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-cyan-200">{action.action} · {statusLabel(action)}</h3><span className="text-xs text-slate-400">{action.progress.completed} of {action.progress.total} completed</span></div>
        <p className="text-xs text-slate-400">Scheduled: {enquiryDate(action.createdAt)} · Due: {enquiryDate(action.next_step_date)} · By {userName(action.forwarded_by)}</p>
        {action.feedback && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{action.feedback}</p>}
        {!action.action_assignments.length && <p className="text-sm text-amber-200">No assignee was recorded for this older action.</p>}
        {action.action_assignments.map((part: any) => <div key={idOf(part.user_id)} className="space-y-2 rounded-lg border border-slate-700 p-3 text-sm">
          <p className="flex flex-wrap justify-between gap-2"><span>{userName(part.user_id)}{idOf(part.user_id) === enquiry.current_actor_id ? ' (you)' : ''}</span><span className={part.status === 'completed' ? 'text-emerald-300' : part.status === 'cancelled' ? 'text-slate-400' : 'text-amber-200'}>{part.status}</span></p>
          {part.status === 'completed' && <><p className="text-xs text-slate-400">Performed: {part.performed_action} · {enquiryDate(part.completed_at)}</p><p className="whitespace-pre-wrap break-words">{part.completion_notes}</p></>}
          {part.status === 'cancelled' && <p className="whitespace-pre-wrap break-words text-slate-400">{part.cancellation_notes} · {enquiryDate(part.cancelled_at)}</p>}
          <div className="flex flex-wrap gap-2">{part.can_complete && <Button size="sm" className="gap-1 bg-emerald-800 text-white hover:bg-emerald-700" onClick={() => choose(action, part, 'complete')}><CheckCircle2 size={14} />Complete my part</Button>}{part.can_cancel && <Button size="sm" variant="ghost" onClick={() => choose(action, part, 'cancel')}>Cancel part</Button>}{part.can_reopen && <Button size="sm" variant="outline" onClick={() => choose(action, part, 'reopen')}>Reopen part</Button>}</div>
        </div>)}
      </article>)}
    </>}
    <DialogFooter><Button variant="outline" asChild><Link href={`${basePath}/${enquiry._id}/history`}>View enquiry history</Link></Button><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
  </div>;
}
