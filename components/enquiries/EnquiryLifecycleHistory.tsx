import { CheckCircle2, RotateCcw } from "lucide-react";
export default function EnquiryLifecycleHistory({ histories }: { histories: any[] }) {
  const events = histories.filter(h => ["ENQUIRY_COMPLETED", "ENQUIRY_REOPENED"].includes(h?.change_type));
  if (!events.length) return null;
  return <section className="space-y-3" aria-label="Completion history"><h2 className="text-lg font-semibold">Completion history</h2>{events.map(h => {
    const reopened = h.change_type === "ENQUIRY_REOPENED";
    return <article key={String(h._id)} className={`space-y-3 rounded-xl border p-4 ${reopened ? "border-cyan-800/60 bg-cyan-950/20" : "border-emerald-800/60 bg-emerald-950/20"}`}>
      <h3 className="flex items-center gap-2 font-semibold">{reopened ? <RotateCcw size={17} /> : <CheckCircle2 size={17} />}{reopened ? "Enquiry Reopened" : "Enquiry Completed"}<span className="ml-auto text-xs font-normal text-slate-400">Step {h.step_number}</span></h3>
      <p className="text-sm">{reopened ? "Reopened" : "Completed"} by: <b>{h.changed_by?.name || h.changed_by?.email || "Unknown user"}</b></p>
      {!reopened && <p className="text-sm">Completed action: <b>{h.action}</b>{h.previous_action && h.previous_action !== h.action && <span className="text-slate-400"> · Changed from {h.previous_action}</span>}</p>}
      <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{h.feedback}</p>
      <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</p>
    </article>;
  })}</section>;
}
