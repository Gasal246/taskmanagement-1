'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { currentTargetMonth, targetTitle, targetWeekLabel, type TargetInput, type TargetChange } from '@/lib/enquiries/targets';
import { targetRequest, useTargets, useSaveTarget, useDeleteTarget } from '@/query/enquirymanager/targets';

export const targetFieldClass = 'w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 [color-scheme:dark]';
export function TargetField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1 text-sm text-slate-300"><span>{label}</span>{children}</label>;
}
export function TargetWeekOptions({ month, filter = false }: { month: string; filter?: boolean }) {
  return <>{filter && <option value="">All weeks</option>}<option value={filter ? 'whole' : ''}>Whole month{filter ? ' only' : ''}</option>{[1, 2, 3, 4].map(week => <option key={week} value={week}>{targetWeekLabel(month, week)}</option>)}</>;
}
export function TargetErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert" className="rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error instanceof Error ? error.message : String(error)}</p> : null;
}
function TargetForm({ title, description, target, input, ready, children, onClose, removeNote = false }: {
  title: string; description: string; target?: any; input: TargetInput | TargetChange; ready: boolean; children: ReactNode; onClose: () => void; removeNote?: boolean;
}) {
  const save = useSaveTarget();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [warning, setWarning] = useState<{ snapshot: string; message: string } | null>(null);
  const busy = checking || save.isPending;
  const snapshot = JSON.stringify(input);
  async function submit(confirmed = false) {
    setError(null); setChecking(true);
    try {
      if (!confirmed && removeNote) {
        setWarning({ snapshot, message: 'Remove this note? The enquiry will remain in the target.' }); return;
      }
      if (!confirmed && target && 'operation' in input && ['period', 'add_enquiries', 'add_members'].includes(input.operation)) {
        const result = await targetRequest('/overlaps', { method: 'POST', body: JSON.stringify({ target_id: target._id, change: input }) });
        if (result.overlaps.length) {
          setWarning({ snapshot, message: `${result.overlaps.length === 100 ? '100 or more' : result.overlaps.length} existing target(s) assign the same enquiry and person during this period. You can still save.` }); return;
        }
      }
      await save.mutateAsync({ id: target?._id, input }); onClose();
    } catch (err) { setError(err); } finally { setChecking(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">{children}</fieldset>
      <TargetErrorMessage error={error} />
      {warning?.snapshot === snapshot && <div role="alert" className="space-y-3 rounded border border-amber-700 bg-amber-950/30 p-3 text-sm"><p>{warning.message}</p><Button type="button" disabled={busy || !ready} onClick={() => void submit(true)}>{removeNote ? 'Confirm remove note' : 'Save despite overlaps'}</Button></div>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={!ready || busy}>{busy ? 'Saving…' : 'Save'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
export function TargetPeriodDialog({ target, businessId, onClose }: { target?: any; businessId: string; onClose: () => void }) {
  const [month, setMonth] = useState(target?.month || currentTargetMonth());
  const [week, setWeek] = useState<number | null>(target?.week ?? null);
  const input: TargetInput | TargetChange = target ? { operation: 'period', month, week } : { business_id: businessId, month, week };
  return <TargetForm title={target ? 'Edit target period' : 'Add target'} description="Choose the target period. Enquiries and members are added separately." target={target} input={input} ready={Boolean(month && (target || businessId))} onClose={onClose}>
    <TargetField label="Target month"><Input required className="[color-scheme:dark]" type="month" min="1900-01" max="2199-12" value={month} onChange={e => setMonth(e.target.value)} /></TargetField>
    <TargetField label="Week (optional)"><select className={targetFieldClass} value={week ?? ''} onChange={e => setWeek(e.target.value ? Number(e.target.value) : null)}><TargetWeekOptions month={month} /></select></TargetField>
    <p className="text-sm text-cyan-200">Target title: {targetTitle(month, week)}</p>
  </TargetForm>;
}
export function TargetEnquiriesDialog({ target, onClose }: { target: any; onClose: () => void }) {
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const options = useTargets({ business_id: target.business_id }, '/options');
  const candidates = useTargets({ business_id: target.business_id, country_id: country, region_id: region, search: searchTerm, page: String(page) }, '/candidates', Boolean(country && region));
  useEffect(() => { const timer = setTimeout(() => { setSearchTerm(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const input: TargetChange = { operation: 'add_enquiries', country_id: country, region_id: region, enquiry_ids: selected, note };
  const available = options.data || {};
  return <TargetForm title="Add enquiries" description={`Add enquiries to ${targetTitle(target.month, target.week)}. The optional note is added to each selected enquiry.`} target={target} input={input} ready={Boolean(region && selected.length)} onClose={onClose}>
    <div className="grid gap-3 sm:grid-cols-2">
      <TargetField label="Country"><select required className={targetFieldClass} value={country} onChange={e => { setCountry(e.target.value); setRegion(''); setSelected([]); setPage(1); }}><option value="">Select country</option>{(available.countries || []).map((c: any) => <option key={c._id} value={c._id}>{c.country_name}</option>)}</select></TargetField>
      <TargetField label="Region"><select required className={targetFieldClass} disabled={!country} value={region} onChange={e => { setRegion(e.target.value); setSelected([]); setPage(1); }}><option value="">Select region</option>{(available.regions || []).filter((r: any) => r.country_id === country).map((r: any) => <option key={r._id} value={r._id}>{r.region_name}</option>)}</select></TargetField>
    </div>
    <section className="space-y-2" aria-label="Select enquiries"><h3 className="text-sm font-semibold">Enquiries · {selected.length} selected</h3>
      <Input aria-label="Search enquiries by number or facility" placeholder="Search enquiry number or facility name…" value={search} onChange={e => setSearch(e.target.value)} disabled={!region} />
      {selected.length > 0 && <div className="flex max-h-24 flex-wrap gap-2 overflow-auto">{selected.map(id => <span className="rounded border border-cyan-800 px-2 py-1 text-xs" key={id}>{labels[id]}</span>)}</div>}
      <div className="max-h-56 space-y-1 overflow-auto rounded border border-slate-800 p-2">
        {!region ? <p className="text-sm text-slate-400">Select a region to load enquiries.</p> : candidates.isLoading ? <p role="status">Loading enquiries…</p> : <>
          {(candidates.data?.data || []).map((e: any) => {
            const label = `${e.enquiry_uuid || 'Enquiry'} · ${e.camp_id?.camp_name || 'Facility not linked'}`;
            const added = target.enquiry_ids.includes(e._id);
            return <label key={e._id} className="flex items-start gap-2 rounded p-2 text-sm hover:bg-slate-900"><input type="checkbox" className="mt-1" disabled={added} checked={added || selected.includes(e._id)} onChange={event => { setLabels(previous => ({ ...previous, [e._id]: label })); setSelected(previous => event.target.checked ? [...previous, e._id] : previous.filter(id => id !== e._id)); }} /><span>{label}{added && <span className="text-slate-400"> · Already added</span>}</span></label>;
          })}
          {!candidates.error && !candidates.data?.data?.length && <p className="text-sm text-slate-400">No enquiries match this region and search.</p>}
        </>}
      </div>
      <TargetErrorMessage error={candidates.error || options.error} />
      {candidates.data?.pagination?.totalPages > 1 && <div className="flex items-center gap-3 text-sm"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page} of {candidates.data.pagination.totalPages}</span><Button type="button" variant="outline" disabled={page >= candidates.data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
    </section>
    <TargetField label="Note (optional)"><textarea className={targetFieldClass} rows={3} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} placeholder="Instructions for the selected enquiries…" /></TargetField>
  </TargetForm>;
}
export function TargetMembersDialog({ target, onClose }: { target: any; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const options = useTargets({ business_id: target.business_id }, '/options');
  const users = (options.data?.users || []).filter((u: any) => !target.assigned_user_ids.includes(u._id) && `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  return <TargetForm title="Add members" description="All target members share the enquiries in this target." target={target} input={{ operation: 'add_members', user_ids: selected }} ready={selected.length > 0} onClose={onClose}>
    <Input aria-label="Search members" placeholder="Search enquiry staff…" value={search} onChange={e => setSearch(e.target.value)} />
    <p className="text-sm text-slate-300">{selected.length} members selected</p>
    <div className="max-h-72 space-y-1 overflow-auto">{users.map((u: any) => <label className="flex items-center gap-3 rounded border border-slate-800 p-3 text-sm" key={u._id}><input type="checkbox" checked={selected.includes(u._id)} onChange={e => setSelected(previous => e.target.checked ? [...previous, u._id] : previous.filter(id => id !== u._id))} /><span>{u.name || u.email}<span className="block text-xs text-slate-400">{u.email}</span></span></label>)}</div>
    {options.isLoading ? <p role="status">Loading staff…</p> : !users.length && <p className="text-sm text-slate-400">No additional enquiry staff match your search.</p>}
    <TargetErrorMessage error={options.error} />
  </TargetForm>;
}
export function TargetNoteDialog({ target, enquiry, onClose }: { target: any; enquiry: any; onClose: () => void }) {
  const [note, setNote] = useState(enquiry.target_note || '');
  return <TargetForm title="Edit enquiry note" description={`${enquiry.enquiry_uuid || 'Enquiry'} · ${enquiry.camp_id?.camp_name || 'Facility not linked'}. This note belongs only to this target.`} target={target} input={{ operation: 'edit_note', enquiry_id: enquiry._id, note }} ready onClose={onClose} removeNote={Boolean(enquiry.target_note && !note.trim())}>
    <TargetField label="Note"><textarea autoFocus className={targetFieldClass} rows={5} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} /></TargetField>
  </TargetForm>;
}
export function TargetRemoveDialog({ target, enquiry, member, onClose }: { target: any; enquiry?: any; member?: any; onClose: () => void }) {
  const remove = useDeleteTarget();
  const save = useSaveTarget();
  const [error, setError] = useState<unknown>(null);
  const busy = remove.isPending || save.isPending;
  const title = enquiry ? 'Remove enquiry from target?' : member ? 'Remove member from target?' : 'Delete target?';
  async function confirm() {
    setError(null);
    try {
      if (enquiry) await save.mutateAsync({ id: target._id, input: { operation: 'remove_enquiry', enquiry_id: enquiry._id } });
      else if (member) await save.mutateAsync({ id: target._id, input: { operation: 'remove_member', user_id: member._id } });
      else await remove.mutateAsync(target._id);
      onClose();
    } catch (err) { setError(err); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="border-slate-700 bg-slate-950 text-slate-100"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{enquiry ? `Remove ${enquiry.enquiry_uuid || 'this enquiry'} and its target note from ${targetTitle(target.month, target.week)}? The enquiry and its history will remain.` : member ? `Remove ${member.name || member.email || 'this member'} from this target? Their other assignments and access will remain.` : `Delete ${targetTitle(target.month, target.week)}, containing ${target.enquiry_count} enquiries and ${target.members.length} members? Enquiries and their histories will remain.`}</DialogDescription></DialogHeader><TargetErrorMessage error={error} /><div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void confirm()}>{busy ? 'Removing…' : enquiry ? 'Confirm remove enquiry' : member ? 'Confirm remove member' : 'Confirm delete target'}</Button></div></DialogContent></Dialog>;
}
