import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
const labels: Record<string, string> = {
  ACTION_COMPLETED: 'Action part completed', ACTION_CANCELLED: 'Action assignment cancelled', ACTION_REOPENED: 'Action assignment reopened',
  ENQUIRY_COMPLETED: 'Legacy enquiry completion (not action completion)', ENQUIRY_REOPENED: 'Legacy enquiry reopening',
};
export default function EnquiryLifecycleHistory({ histories }: { histories: any[] }) {
  const events = histories.filter(h => labels[h?.change_type]);
  if (!events.length) return null;
  return <section className="space-y-3" aria-label="Action completion history"><h2 className="text-lg font-semibold">Action completion history</h2>{events.map(h => <article key={String(h._id)} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
    <h3 className="flex items-center gap-2 font-semibold">{h.change_type === 'ACTION_COMPLETED' ? <CheckCircle2 size={17} className="text-emerald-300" /> : h.change_type === 'ACTION_CANCELLED' ? <XCircle size={17} /> : <RotateCcw size={17} />}{labels[h.change_type]}<span className="ml-auto text-xs text-slate-400">Step {h.step_number}</span></h3>
    {h.action_assignee && <p className="text-sm">Assignee: <b>{h.action_assignee.name || h.action_assignee.email || 'Unknown user'}</b></p>}
    <p className="text-sm">Recorded by: <b>{h.changed_by?.name || h.changed_by?.email || 'Unknown user'}</b></p>
    <p className="text-sm">Action: <b>{h.action}</b>{h.previous_action && h.previous_action !== h.action && <span className="text-slate-400"> · Planned: {h.previous_action}</span>}</p>
    <p className="whitespace-pre-wrap break-words text-sm">{h.feedback}</p><p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</p>
  </article>)}</section>;
}
