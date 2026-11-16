'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Filter, Pencil, Plus, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import EnquiryCard from './EnquiryCard';
import { enquiryDate } from './EnquiryCompletionActions';
import { currentTargetMonth, targetTitle, targetWeekLabel } from '@/lib/enquiries/targets';
import { useTargets } from '@/query/enquirymanager/targets';
import { TargetField, TargetErrorMessage, TargetPeriodDialog, TargetEnquiriesDialog, TargetMembersDialog, TargetNoteDialog, TargetRemoveDialog } from './TargetDialogs';

type Filters = { business_id: string; country_id: string; region_id: string; month: string; week: string; person: string };
type TargetModal = { kind: 'period' | 'enquiries' | 'members' | 'note' | 'remove'; target?: any; enquiry?: any; member?: any };
function TargetFilterSelect({ label, value, onValueChange, allLabel, options }: {
  label: string; value: string; onValueChange: (value: string) => void; allLabel: string; options: { value: string; label: string }[];
}) {
  return <TargetField label={label}>
    <Select value={value || 'all'} onValueChange={selected => onValueChange(selected === 'all' ? '' : selected)}>
      <SelectTrigger aria-label={label} className="border-slate-700 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </TargetField>;
}
function TargetGroup({ target, admin, filters, open }: { target: any; admin: boolean; filters: Filters; open: (modal: TargetModal) => void }) {
  const [page, setPage] = useState(1);
  const list = useTargets({ page: String(page), country_id: filters.country_id, region_id: filters.region_id, view: admin ? 'admin' : 'staff' }, `/${target._id}/enquiries`, page > 1);
  const data = page === 1 ? { data: target.enquiries, pagination: target.enquiryPagination } : list.data;
  const pagination = data?.pagination;
  useEffect(() => { if (pagination && page > Math.max(1, pagination.totalPages)) setPage(Math.max(1, pagination.totalPages)); }, [pagination, page]);
  const title = targetTitle(target.month, target.week, target.title);
  return <section aria-label={title} data-target-id={target._id} className="space-y-5 rounded-2xl border border-slate-700 bg-slate-950/50 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h2>{target.title?.trim() && <p className="mt-1 text-base font-medium text-slate-300">{targetTitle(target.month, target.week)}</p>}</div>{admin && <div className="flex flex-wrap gap-2">
      <Button size="icon" variant="outline" title="Edit target" aria-label={`Edit target: ${title}`} onClick={() => open({ kind: 'period', target })}><Pencil size={16} /></Button>
      <Button size="icon" variant="outline" title="Delete target" aria-label={`Delete target: ${title}`} onClick={() => open({ kind: 'remove', target })}><X size={18} /></Button>
    </div>}</header>
    <div className="space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-300">Enquiries · {pagination?.totalRecords ?? 0}{filters.country_id || filters.region_id ? ' matching filters' : ''}</h3>{admin && <Button size="sm" variant="outline" onClick={() => open({ kind: 'enquiries', target })}><Plus size={15} className="mr-1" />Enquiry</Button>}</div>
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
    <div className="space-y-3 border-t border-slate-800 pt-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-300">Target Members · {target.members.length}</h3>{admin && <Button size="sm" variant="outline" onClick={() => open({ kind: 'members', target })}><Plus size={15} className="mr-1" />Member</Button>}</div><div className="flex flex-wrap items-center gap-2">
      {target.members.map((member: any) => <div key={member._id} className="flex max-w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm"><span className="min-w-0 break-words">{member.name || member.email}</span>{admin && <button type="button" className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label={`Remove member: ${member.name || member.email}`} onClick={() => open({ kind: 'remove', target, member })}><X size={16} /></button>}</div>)}
      {!target.members.length && <span className="text-sm text-slate-400">No members added yet.</span>}
    </div></div>
    <footer className="text-xs text-slate-400">Created at: {enquiryDate(target.createdAt)}</footer>
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
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-5">
      <div><h1 className="text-2xl font-semibold">{admin ? 'Targets' : 'My Targets'}</h1><p className="mt-1 text-sm text-slate-400">Shared enquiry work by month and week. Latest target periods first.</p></div>
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild><Button variant="outline"><Filter size={16} className="mr-2" />Filter</Button></SheetTrigger>
          <SheetContent className="w-full overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-slate-100">Filter targets</SheetTitle>
              <SheetDescription>Choose filters to update the targets shown.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <TargetFilterSelect label="Country" value={filters.country_id} onValueChange={country_id => change({ country_id, region_id: '' })} allLabel="All countries" options={(available.countries || []).map((c: any) => ({ value: c._id, label: c.country_name }))} />
              <TargetFilterSelect label="Region" value={filters.region_id} onValueChange={region_id => change({ region_id })} allLabel="All regions" options={(available.regions || []).filter((r: any) => !filters.country_id || r.country_id === filters.country_id).map((r: any) => ({ value: r._id, label: r.region_name }))} />
              <TargetField label={filters.month ? 'Month' : 'Month · All months'}><span className="flex gap-2"><Input aria-label="Filter month" className="min-w-0 [color-scheme:dark]" type="month" value={filters.month} onChange={e => change({ month: e.target.value })} /><Button variant="outline" onClick={() => change({ month: filters.month ? '' : currentTargetMonth() })}>{filters.month ? 'All months' : 'Current'}</Button></span></TargetField>
              <TargetFilterSelect label="Week" value={filters.week} onValueChange={week => change({ week })} allLabel="All weeks" options={[{ value: 'whole', label: 'Whole month only' }, ...[1, 2, 3, 4].map(week => ({ value: String(week), label: targetWeekLabel(filters.month, week) }))]} />
              {admin && <TargetFilterSelect label="Assigned person" value={filters.person} onValueChange={person => change({ person })} allLabel="All people" options={(available.users || []).map((u: any) => ({ value: u._id, label: u.name || u.email }))} />}
            </div>
          </SheetContent>
        </Sheet>
        {admin && <Button disabled={!selectedBusiness} onClick={() => setModal({ kind: 'period' })}>Add target</Button>}
      </div>
    </header>
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
