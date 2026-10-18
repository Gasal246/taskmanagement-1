'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnquiryCard from './EnquiryCard';
import { enquiryDate } from './EnquiryCompletionActions';
import { currentTargetMonth, targetTitle } from '@/lib/enquiries/targets';
import { useTargets } from '@/query/enquirymanager/targets';
import { TargetField, targetFieldClass, TargetWeekOptions, TargetErrorMessage, TargetPeriodDialog, TargetEnquiriesDialog, TargetMembersDialog, TargetNoteDialog, TargetRemoveDialog } from './TargetDialogs';

type Filters = { business_id: string; country_id: string; region_id: string; month: string; week: string; person: string };
type TargetModal = { kind: 'period' | 'enquiries' | 'members' | 'note' | 'remove'; target?: any; enquiry?: any; member?: any };
function TargetGroup({ target, admin, filters, open }: { target: any; admin: boolean; filters: Filters; open: (modal: TargetModal) => void }) {
  const [page, setPage] = useState(1);
  const list = useTargets({ page: String(page), country_id: filters.country_id, region_id: filters.region_id, view: admin ? 'admin' : 'staff' }, `/${target._id}/enquiries`, page > 1);
  const data = page === 1 ? { data: target.enquiries, pagination: target.enquiryPagination } : list.data;
  const pagination = data?.pagination;
  useEffect(() => { if (pagination && page > Math.max(1, pagination.totalPages)) setPage(Math.max(1, pagination.totalPages)); }, [pagination, page]);
  const title = targetTitle(target.month, target.week);
  return <section aria-label={title} data-target-id={target._id} className="space-y-5 rounded-2xl border border-slate-700 bg-slate-950/50 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h2><p className="mt-1 text-xs text-slate-400">Created at: {enquiryDate(target.createdAt)}</p></div>{admin && <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => open({ kind: 'enquiries', target })}><Plus size={15} className="mr-1" />Enquiry</Button>
      <Button size="icon" variant="outline" title="Edit target period" aria-label={`Edit target period: ${title}`} onClick={() => open({ kind: 'period', target })}><Pencil size={16} /></Button>
      <Button size="icon" variant="outline" title="Delete target" aria-label={`Delete target: ${title}`} onClick={() => open({ kind: 'remove', target })}><X size={18} /></Button>
    </div>}</header>
    <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-300">Enquiries · {pagination?.totalRecords ?? 0}{filters.country_id || filters.region_id ? ' matching filters' : ''}</h3>
      <TargetErrorMessage error={list.error} />
      {page > 1 && list.isLoading ? <p role="status">Loading enquiries…</p> : <>
        {(data?.data || []).map((enquiry: any, index: number) => <EnquiryCard key={enquiry._id} enquiry={enquiry} number={(page - 1) * 10 + index + 1} basePath={admin ? '/admin/enquiries' : '/staff/enquiry'} staff={!admin} targetNote={enquiry.target_note} targetControls={admin ? <>
          <Button size="icon" variant="outline" title="Edit enquiry note" aria-label={`Edit note: ${enquiry.enquiry_uuid || enquiry._id}`} onClick={() => open({ kind: 'note', target, enquiry })}><Pencil size={15} /></Button>
          <Button size="icon" variant="outline" title="Remove enquiry from target" aria-label={`Remove enquiry: ${enquiry.enquiry_uuid || enquiry._id}`} onClick={() => open({ kind: 'remove', target, enquiry })}><X size={17} /></Button>
        </> : undefined} />)}
        {!list.error && !data?.data?.length && <p className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-400">{admin ? 'No enquiries added yet. Use + Enquiry to add work to this target.' : 'No enquiries added to this target yet.'}</p>}
      </>}
      {list.error && <Button size="sm" variant="outline" onClick={() => void list.refetch()}>Retry enquiries</Button>}
      {pagination?.totalPages > 1 && <nav aria-label={`Enquiry pages for ${title}`} className="flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous enquiries</Button><span className="text-xs">{page} / {pagination.totalPages}</span><Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next enquiries</Button></nav>}
    </div>
    <div className="space-y-3 border-t border-slate-800 pt-4"><h3 className="text-sm font-semibold text-slate-300">Target Members · {target.members.length}</h3><div className="flex flex-wrap items-center gap-2">
      {target.members.map((member: any) => <div key={member._id} className="flex max-w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm"><span className="min-w-0 break-words">{member.name || member.email}</span>{admin && <button type="button" className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label={`Remove member: ${member.name || member.email}`} onClick={() => open({ kind: 'remove', target, member })}><X size={16} /></button>}</div>)}
      {!target.members.length && <span className="text-sm text-slate-400">No members added yet.</span>}
      {admin && <Button size="sm" variant="outline" onClick={() => open({ kind: 'members', target })}><Plus size={15} className="mr-1" />Member</Button>}
    </div></div>
  </section>;
}
export default function EnquiryTargets({ admin = false }: { admin?: boolean }) {
  const businessId = useSelector((state: RootState) => state.user.businessData?._id) || '';
  const [filters, setFilters] = useState<Filters>({ business_id: '', country_id: '', region_id: '', month: currentTargetMonth(), week: '', person: '' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<TargetModal | null>(null);
  const view = admin ? 'admin' : 'staff';
  const options = useTargets({ view, business_id: filters.business_id }, '/options');
  const list = useTargets({ ...filters, view, page: String(page), limit: '5' });
  useEffect(() => { if (admin && businessId) { setFilters(previous => ({ ...previous, business_id: businessId, person: '' })); setPage(1); } }, [admin, businessId]);
  function change(patch: Partial<Filters>) { setFilters(previous => ({ ...previous, ...patch })); setPage(1); }
  const available = options.data || {};
  const selectedBusiness = filters.business_id || (available.businesses?.length === 1 ? available.businesses[0]._id : '');
  const pagination = list.data?.pagination;
  useEffect(() => { if (pagination && page > Math.max(1, pagination.totalPages)) setPage(Math.max(1, pagination.totalPages)); }, [pagination, page]);
  const close = () => setModal(null);
  return <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24 text-slate-100 sm:p-6">
    <Link className="text-sm text-cyan-300 hover:underline" href={admin ? '/admin/enquiries' : '/staff/enquiry'}>← Enquiries</Link>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-5"><div><h1 className="text-2xl font-semibold">{admin ? 'Targets' : 'My Targets'}</h1><p className="mt-1 text-sm text-slate-400">Shared enquiry work by month and week. Latest target periods first.</p></div>{admin && <div><Button disabled={!selectedBusiness} onClick={() => setModal({ kind: 'period' })}>Add target</Button>{!selectedBusiness && <p className="mt-1 text-xs text-slate-400">Select a business below to add a target.</p>}</div>}</header>
    <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {admin && <TargetField label="Business"><select className={targetFieldClass} value={filters.business_id} onChange={e => change({ business_id: e.target.value, person: '' })}><option value="">All businesses</option>{(available.businesses || []).map((b: any) => <option key={b._id} value={b._id}>{b.business_name}</option>)}</select></TargetField>}
      <TargetField label="Country"><select className={targetFieldClass} value={filters.country_id} onChange={e => change({ country_id: e.target.value, region_id: '' })}><option value="">All countries</option>{(available.countries || []).map((c: any) => <option key={c._id} value={c._id}>{c.country_name}</option>)}</select></TargetField>
      <TargetField label="Region"><select className={targetFieldClass} value={filters.region_id} onChange={e => change({ region_id: e.target.value })}><option value="">All regions</option>{(available.regions || []).filter((r: any) => !filters.country_id || r.country_id === filters.country_id).map((r: any) => <option key={r._id} value={r._id}>{r.region_name}</option>)}</select></TargetField>
      <TargetField label={filters.month ? 'Month' : 'Month · All months'}><span className="flex gap-2"><Input aria-label="Filter month" className="min-w-0 [color-scheme:dark]" type="month" value={filters.month} onChange={e => change({ month: e.target.value })} /><Button variant="outline" onClick={() => change({ month: filters.month ? '' : currentTargetMonth() })}>{filters.month ? 'All months' : 'Current'}</Button></span></TargetField>
      <TargetField label="Week"><select className={targetFieldClass} value={filters.week} onChange={e => change({ week: e.target.value })}><TargetWeekOptions filter month={filters.month} /></select></TargetField>
      {admin && <TargetField label="Assigned person"><select className={targetFieldClass} value={filters.person} onChange={e => change({ person: e.target.value })}><option value="">All people</option>{(available.users || []).map((u: any) => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}</select></TargetField>}
    </div>
    <TargetErrorMessage error={list.error || options.error} />
    {list.error && <Button variant="outline" onClick={() => void list.refetch()}>Retry</Button>}
    {list.isLoading ? <p role="status">Loading targets…</p> : <>
      <p className="text-sm text-slate-400">{pagination?.totalRecords || 0} targets{list.isFetching ? ' · Updating…' : ''}</p>
      {!list.error && !list.data?.data?.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">{admin ? 'No targets match these filters. Add a target or choose another month.' : 'No targets assigned to you match these filters. Try another month.'}</div>}
      <div className="space-y-5">{(list.data?.data || []).map((target: any) => <TargetGroup key={`${target._id}:${filters.country_id}:${filters.region_id}`} target={target} admin={admin} filters={filters} open={setModal} />)}</div>
      {pagination?.totalPages > 1 && <nav aria-label="Target pages" className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous targets</Button><span className="text-sm">Page {page} of {pagination.totalPages}</span><Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next targets</Button></nav>}
    </>}
    {modal?.kind === 'period' && <TargetPeriodDialog target={modal.target} businessId={selectedBusiness} onClose={close} />}
    {modal?.kind === 'enquiries' && <TargetEnquiriesDialog target={modal.target} onClose={close} />}
    {modal?.kind === 'members' && <TargetMembersDialog target={modal.target} onClose={close} />}
    {modal?.kind === 'note' && <TargetNoteDialog target={modal.target} enquiry={modal.enquiry} onClose={close} />}
    {modal?.kind === 'remove' && <TargetRemoveDialog target={modal.target} enquiry={modal.enquiry} member={modal.member} onClose={close} />}
  </main>;
}
