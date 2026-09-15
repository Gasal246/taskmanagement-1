import { actionProgress, assignmentsFor, idOf } from '@/lib/enquiries/completion';
export default function EnquiryActionProgress({ action }: { action: any }) {
  if (!['Call', 'Visit'].includes(action?.action)) return null;
  const progress = actionProgress(action);
  return <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm">
    <p className="font-medium text-cyan-200">{progress.completed} of {progress.total} assignees completed{progress.overdue ? ' · Overdue' : ''}</p>
    {assignmentsFor(action).map((part: any) => <div key={idOf(part.user_id)} className="mt-2 text-slate-300"><p>{part.user_id?.name || part.user_id?.email || 'Assignee'} · {part.status}</p>{part.completion_notes && <p className="whitespace-pre-wrap break-words text-xs text-slate-400">{part.performed_action} · {new Date(part.completed_at).toLocaleString()} · {part.completion_notes}</p>}</div>)}
  </div>;
}
