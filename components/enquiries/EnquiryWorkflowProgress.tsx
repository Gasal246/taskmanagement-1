'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Circle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { workflowProgress } from '@/lib/enquiries/workflow-progress';
type Progress = ReturnType<typeof workflowProgress>;
type Operation = { operation: 'complete' | 'skip' | 'reopen'; stage_number: number; name: string; expected_revision: number; configuration_revision: number };
export default function EnquiryWorkflowProgress({ enquiry, compact = false }: { enquiry: any; compact?: boolean }) {
  const workflow = enquiry?.workflow as Progress | undefined;
  const [confirmation, setConfirmation] = useState<Operation | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const guard = useRef(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: Operation) => {
      const response = await fetch('/api/enquiries/workflow/transition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enquiry_id: enquiry._id, operation: input.operation, stage_number: input.stage_number, expected_revision: input.expected_revision, configuration_revision: input.configuration_revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update workflow');
      return data;
    },
    meta: { refresh: false },
    onSuccess: async () => { await queryClient.invalidateQueries(); setConfirmation(null); },
    onError: async error => { toast.error(error.message); await queryClient.invalidateQueries(); setConfirmation(null); },
  });
  useEffect(() => {
    const element = scroller.current;
    if (!element || !compact) return;
    const reveal = () => {
      const target = element.querySelector<HTMLElement>('[aria-current="step"]') || element.lastElementChild as HTMLElement;
      if (!target) return;
      const start = target.offsetLeft, end = start + target.offsetWidth;
      if (start < element.scrollLeft || end > element.scrollLeft + element.clientWidth) element.scrollTo({ left: Math.max(0, start - (element.clientWidth - target.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(element);
    return () => observer.disconnect();
  }, [compact, workflow?.current_stage, workflow?.configuration_revision]);
  function confirm(input: Omit<Operation, 'expected_revision' | 'configuration_revision'>) {
    if (workflow) setConfirmation({ ...input, expected_revision: workflow.revision, configuration_revision: workflow.configuration_revision });
  }
  const current = workflow?.stages.find(s => s.state === 'current');
  return <section className={`relative z-10 min-w-0 border-t border-slate-800 ${compact ? 'space-y-2 py-2' : 'space-y-3 py-4'}`} aria-label={compact ? 'Enquiry Stage' : 'Enquiry Stages'}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-200`}>{compact ? 'Enquiry Stage' : 'Enquiry Stages'}</h2>{workflow?.available && <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-400`}>{workflow.completed}/{workflow.total} stages completed</span>}</div>
    {!workflow?.available ? <p className="text-xs text-slate-500">{enquiry?.business_id ? 'No workflow stages configured for this business.' : 'Workflow unavailable: business ownership is not configured.'}</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium text-slate-200`}>{current ? <>Current: {current.name} <span title={current.role?.name} style={{ color: current.role?.color_code }} className="ml-2">{current.role?.subname}</span></> : <span className="text-emerald-300">All stages completed</span>}</p>
        {workflow.can_skip && current && <Button variant="outline" size="sm" className={compact ? 'h-7 px-2 text-[11px]' : undefined} disabled={mutation.isPending} onClick={() => confirm({ operation: 'skip', stage_number: current.number, name: current.name })}>Skip stage</Button>}
      </div>
      <div ref={scroller} tabIndex={compact ? 0 : undefined} aria-label={compact ? 'Workflow stage timeline; scroll horizontally' : 'Workflow stages'} className={compact ? 'relative flex overflow-x-auto overscroll-x-contain pb-1' : 'flex flex-wrap gap-2'}>
        {workflow.stages.map(stage => <div key={stage._id} aria-current={stage.state === 'current' ? 'step' : undefined} className={compact ? 'relative flex w-36 shrink-0 flex-col items-center px-2 pt-1 text-center' : `flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${stage.state === 'completed' ? 'border-emerald-700/70 bg-emerald-950/40 text-emerald-200' : stage.state === 'current' ? 'border-cyan-500 bg-cyan-950/50 text-cyan-100' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}>
          {compact && <span aria-hidden className={`absolute left-0 right-0 top-3.5 h-px ${stage.state === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
          <span aria-hidden className={compact ? `relative mb-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${stage.state === 'completed' ? 'border-emerald-400 bg-emerald-600 text-white' : stage.state === 'current' ? 'border-cyan-200 bg-cyan-600 ring-2 ring-cyan-500/20' : 'border-slate-700 bg-slate-950 text-slate-600'}` : ''}>{stage.state === 'completed' ? <Check size={compact ? 11 : 14} /> : <Circle size={compact ? 7 : 12} />}</span>
          <span className={compact ? `relative text-[11px] leading-tight ${stage.state === 'future' ? 'text-slate-500' : 'text-slate-200'}` : ''}>{stage.name}<span className="sr-only"> — {stage.state}</span></span>
          <span title={stage.role?.name} aria-label={stage.role ? `${stage.role.subname} - ${stage.role.name}` : 'Role unavailable'} style={{ color: stage.role?.color_code }} className={compact ? 'mt-0.5 text-[10px] leading-tight font-semibold' : 'text-[11px] font-semibold'}>{stage.role?.subname}</span>
          {!compact && stage.can_reopen && <button type="button" disabled={mutation.isPending} onClick={() => confirm({ operation: 'reopen', stage_number: stage.number, name: stage.name })} aria-label={`Reopen ${stage.name}`} title={`Reopen ${stage.name}`} className="rounded p-1 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400"><RotateCcw size={13} /></button>}
        </div>)}
      </div>
      {!compact && current?.can_complete && <Button size="sm" disabled={mutation.isPending} onClick={() => confirm({ operation: 'complete', stage_number: current.number, name: current.name })}>Mark stage completed</Button>}
    </>}
    <AlertDialog open={Boolean(confirmation)} onOpenChange={open => { if (!open && !mutation.isPending) setConfirmation(null); }}><AlertDialogContent className="border-slate-700 bg-slate-950 text-slate-100"><AlertDialogHeader><AlertDialogTitle>{confirmation?.operation === 'reopen' ? 'Reopen' : confirmation?.operation === 'skip' ? 'Skip' : 'Complete'} stage?</AlertDialogTitle><AlertDialogDescription>{confirmation?.name}. {confirmation?.operation === 'reopen' ? 'This stage becomes current and all later stages become incomplete.' : 'This stage will be marked completed and the workflow will advance.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={mutation.isPending} onClick={async event => { event.preventDefault(); if (!confirmation || guard.current) return; guard.current = true; try { await mutation.mutateAsync(confirmation); } catch { /* The mutation reports and refreshes errors. */ } finally { guard.current = false; } }}>{mutation.isPending ? 'Saving…' : 'Confirm'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
