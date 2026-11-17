'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical, ListOrdered, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RootState } from '@/redux/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useEnquiryWorkflow } from '@/query/enquirymanager/workflow';
import { DEFAULT_ROLE_COLOR, roleColorSchema, normalizeRoleSubname, type WorkflowInput, type WorkflowRole, type WorkflowStage } from '@/lib/enquiries/workflow';

type Editor = { kind: 'stage'; item?: WorkflowStage } | { kind: 'role'; item?: WorkflowRole };
type Deletion = { kind: 'stage' | 'role'; id: string; name: string };
const panel = 'border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950/70';
const field = 'border-slate-700 bg-slate-900 text-slate-100';
const primary = 'rounded-s-lg rounded-e-full bg-cyan-700 text-white hover:bg-cyan-600';

export default function ManageStagesPage() {
  const businessId = useSelector((state: RootState) => state.user.businessData?._id);
  return <WorkflowManager key={businessId || 'none'} businessId={businessId} />;
}

function WorkflowManager({ businessId }: { businessId?: string }) {
  const { query, mutation } = useEnquiryWorkflow(businessId);
  const [tab, setTab] = useState('stages');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [name, setName] = useState('');
  const [subname, setSubname] = useState('');
  const [colorCode, setColorCode] = useState(DEFAULT_ROLE_COLOR);
  const [roleId, setRoleId] = useState('');
  const [formError, setFormError] = useState('');
  const [editorRevision, setEditorRevision] = useState(0);
  const [deleteRevision, setDeleteRevision] = useState(0);
  const [ordered, setOrdered] = useState<WorkflowStage[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragRevision = useRef(0);
  const locked = useRef(false);
  const data = query.data;
  const latestData = useRef(data);
  latestData.current = data;
  const roles = data?.roles ?? [];
  const busy = mutation.isPending;

  useEffect(() => {
    if (!dragging) setOrdered(data?.stages ?? []);
  }, [data, dragging]);

  function openEditor(value: Editor) {
    setEditor(value);
    setEditorRevision(data?.revision ?? 0);
    setName(value.item?.name ?? '');
    setSubname(value.kind === 'role' ? value.item?.subname ?? '' : '');
    setColorCode(value.kind === 'role' ? value.item?.color_code ?? DEFAULT_ROLE_COLOR : DEFAULT_ROLE_COLOR);
    setRoleId(value.kind === 'stage' ? value.item?.role_id ?? '' : '');
    setFormError('');
  }
  async function save(input: WorkflowInput, revision = data?.revision ?? 0) {
    if (locked.current) return false;
    locked.current = true;
    try {
      await mutation.mutateAsync({ input, revision });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save changes');
      return false;
    } finally { locked.current = false; }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (!name.trim()) { setFormError('Enter a name.'); return; }
    let input: WorkflowInput;
    if (editor.kind === 'role') {
      if (!/^[A-Z]+$/.test(subname)) { setFormError('Use only letters A–Z for the role subname.'); return; }
      if (roles.some(r => r.subname === subname && r._id !== editor.item?._id)) { setFormError('This role subname is already used in this business.'); return; }
      const color = roleColorSchema.safeParse(colorCode);
      if (!color.success) { setFormError('Enter a six-digit hex color, such as #67e8f9.'); return; }
      input = editor.item ? { operation: 'edit_role', id: editor.item._id, subname, name: name.trim(), color_code: color.data } : { operation: 'add_role', subname, name: name.trim(), color_code: color.data };
    } else {
      if (!roleId) { setFormError('Select a role.'); return; }
      input = editor.item ? { operation: 'edit_stage', id: editor.item._id, name: name.trim(), role_id: roleId } : { operation: 'add_stage', name: name.trim(), role_id: roleId };
    }
    if (await save(input, editorRevision)) setEditor(null);
  }
  async function persistOrder(stages: WorkflowStage[], revision: number) {
    if (stages.every((stage, index) => stage._id === data?.stages[index]?._id)) return;
    setOrdered(stages);
    if (!await save({ operation: 'reorder', stage_ids: stages.map(s => s._id) }, revision)) setOrdered(latestData.current?.stages ?? []);
  }
  function move(index: number, direction: number) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length || busy || dragging) return;
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next, data!.revision);
  }
  function confirmDelete(value: Deletion) {
    setDeleteRevision(data?.revision ?? 0);
    setDeletion(value);
  }
  const ready = Boolean(businessId && data && !query.isError);

  return (
    <div className="space-y-4 p-4 pb-20">
      <nav className="flex gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/admin/enquiries" className="hover:text-cyan-300">Enquiries</Link><span>/</span><span className="text-slate-200">Manage Stages</span>
      </nav>
      <header className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-gradient-to-r from-cyan-950/35 via-slate-900/75 to-emerald-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-100"><ListOrdered size={20} className="text-cyan-300" />Enquiry Stages</h1>
          <p className="mt-1 text-xs text-slate-400">Configure workflow stages and their responsible roles.</p>
        </div>
        <Button className={primary} disabled={!ready || busy || dragging} onClick={() => openEditor({ kind: tab === 'stages' ? 'stage' : 'role' })}><Plus size={15} className="mr-1" />Add {tab === 'stages' ? 'Stage' : 'Role'}</Button>
      </header>
      {!businessId ? <p className="text-sm text-slate-400">Select a business to configure its enquiry workflow.</p> : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Workflow configuration" className="grid h-auto w-full grid-cols-2 items-stretch rounded-none bg-transparent p-0">
            {['stages', 'roles'].map(value => <TabsTrigger key={value} value={value} className="relative rounded-none border border-slate-700 bg-slate-950 py-4 font-medium uppercase text-slate-400 shadow-none transition-colors first:rounded-tl-xl last:rounded-tr-xl [&:not(:first-child)]:-ml-px hover:bg-slate-800 hover:text-slate-200 focus-visible:z-20 focus-visible:ring-inset focus-visible:ring-cyan-400 focus-visible:ring-offset-0 data-[state=inactive]:border-b-cyan-300 data-[state=active]:z-10 data-[state=active]:border-cyan-300 data-[state=active]:border-b-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:font-semibold data-[state=active]:text-cyan-300 data-[state=active]:shadow-none">{value}</TabsTrigger>)}
          </TabsList>
          <div className="rounded-b-xl border border-t-0 border-cyan-300 bg-slate-900 p-4 md:p-5">
            {query.isLoading && <p role="status" className="py-8 text-center text-sm text-slate-400">Loading workflow configuration…</p>}
            {query.isError && <div role="alert" className="space-y-3 py-6 text-center"><p className="text-sm text-red-300">{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div>}
            {ready && <>
              <TabsContent value="stages" className="mt-0">
                <p className="mb-4 text-xs text-slate-400">Drag a stage by its handle or use the arrows to change its position.</p>
                {ordered.length === 0 ? <EmptyState title="No stages yet" description={roles.length ? 'Add your first stage to start building the enquiry workflow.' : 'Create a role in the Roles tab, then add your first stage.'} /> : (
                  <Reorder.Group axis="y" values={ordered} onReorder={setOrdered} className="space-y-3" aria-label="Enquiry stage order">
                    {ordered.map((stage, index) => <StageCard key={stage._id} stage={stage} index={index} count={ordered.length} role={roles.find(r => r._id === stage.role_id)} disabled={busy} dragging={dragging}
                      onMove={direction => move(index, direction)} onEdit={() => openEditor({ kind: 'stage', item: stage })}
                      onDelete={() => confirmDelete({ kind: 'stage', id: stage._id, name: stage.name })}
                      onDragStart={() => { dragRevision.current = data!.revision; setDragging(true); }}
                      onDragEnd={() => { void persistOrder(ordered, dragRevision.current).finally(() => setDragging(false)); }} />)}
                  </Reorder.Group>
                )}
              </TabsContent>
              <TabsContent value="roles" className="mt-0">
                {roles.length === 0 ? <EmptyState title="No roles yet" description="Add a role to define responsibility for your enquiry stages." /> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.map(role => <article key={role._id} className={`flex items-start justify-between gap-3 rounded-xl border p-5 ${panel}`}>
                    <div className="min-w-0"><h2 className="break-words text-xl font-semibold" style={{ color: role.color_code ?? DEFAULT_ROLE_COLOR }}>{role.subname}</h2><p className="mt-1 break-words text-sm text-slate-400">{role.name}</p></div>
                    <div className="flex shrink-0 gap-1"><IconButton label={`Edit role ${role.subname}`} disabled={busy} onClick={() => openEditor({ kind: 'role', item: role })}><Pencil size={15} /></IconButton><IconButton label={`Delete role ${role.subname}`} disabled={busy} destructive onClick={() => confirmDelete({ kind: 'role', id: role._id, name: role.subname })}><Trash2 size={15} /></IconButton></div>
                  </article>)}
                </div>}
              </TabsContent>
            </>}
          </div>
        </Tabs>
      )}
      <p role="status" aria-live="polite" className="sr-only">{busy ? 'Saving workflow changes' : `Workflow has ${data?.stages.length ?? 0} stages`}</p>
      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open && !busy) setEditor(null); }}>
        <DialogContent className="max-w-md border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader><DialogTitle>{editor?.item ? 'Edit' : 'Add'} {editor?.kind === 'role' ? 'Role' : 'Stage'}</DialogTitle><DialogDescription>{editor?.kind === 'role' ? 'Define a role responsible for enquiry workflow stages.' : 'Choose a stage name and its responsible role.'}</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              {editor?.kind === 'role' && <div className="space-y-2"><Label htmlFor="role-subname">Role subname</Label><Input id="role-subname" style={{ color: roleColorSchema.safeParse(colorCode).success ? colorCode : DEFAULT_ROLE_COLOR }} autoFocus value={subname} onChange={event => setSubname(normalizeRoleSubname(event.target.value))} maxLength={32} placeholder="AM" required className={field} aria-describedby="subname-hint" /><p id="subname-hint" className="text-xs text-slate-400">Letters A–Z only, without spaces. Must be unique in this business.</p></div>}
              <div className="space-y-2"><Label htmlFor="workflow-name">{editor?.kind === 'role' ? 'Role' : 'Stage'} name</Label><Input id="workflow-name" autoFocus={editor?.kind === 'stage'} value={name} onChange={event => setName(event.target.value)} maxLength={200} placeholder={editor?.kind === 'role' ? 'Account Manager' : 'Initial enquiry review'} required className={field} /></div>
              {editor?.kind === 'role' && <div className="space-y-2"><Label htmlFor="role-color">Role color</Label><div className="flex items-center gap-3"><Input id="role-color" type="color" value={roleColorSchema.safeParse(colorCode).success ? colorCode : DEFAULT_ROLE_COLOR} onChange={event => setColorCode(event.target.value)} className={`h-10 w-14 shrink-0 cursor-pointer p-1 ${field}`} /><Input aria-label="Role color hex code" value={colorCode} onChange={event => setColorCode(event.target.value)} maxLength={7} placeholder="#67e8f9" spellCheck={false} className={field} /></div></div>}
              {editor?.kind === 'stage' && <div className="space-y-2"><Label htmlFor="stage-role">Role</Label><Select value={roleId} onValueChange={setRoleId} disabled={!roles.length || busy}><SelectTrigger id="stage-role" className={field}><SelectValue placeholder="Select a role" /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role._id} value={role._id}>{role.subname} - {role.name}</SelectItem>)}</SelectContent></Select>{!roles.length && <p className="text-xs text-amber-300">Create a role in the Roles tab before adding a stage.</p>}</div>}
            </fieldset>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>Cancel</Button><Button type="submit" className={primary} disabled={busy || (editor?.kind === 'stage' && !roles.length)}>{busy ? 'Saving…' : 'Save'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deletion)} onOpenChange={open => { if (!open && !busy) setDeletion(null); }}>
        <AlertDialogContent className="border-slate-700 bg-slate-950 text-slate-100">
          <AlertDialogHeader><AlertDialogTitle>Delete {deletion?.kind}?</AlertDialogTitle><AlertDialogDescription>Delete “{deletion?.name}”? This cannot be undone.{deletion?.kind === 'role' && ' Roles assigned to stages must be reassigned or their stages deleted first.'}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} className="bg-red-700 text-white hover:bg-red-600" onClick={async event => { event.preventDefault(); if (deletion && await save({ operation: deletion.kind === 'role' ? 'delete_role' : 'delete_stage', id: deletion.id }, deleteRevision)) setDeletion(null); }}>{busy ? 'Deleting…' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StageCard({ stage, role, index, count, disabled, dragging, onMove, onEdit, onDelete, onDragStart, onDragEnd }: {
  stage: WorkflowStage; role?: WorkflowRole; index: number; count: number; disabled: boolean; dragging: boolean;
  onMove: (direction: number) => void; onEdit: () => void; onDelete: () => void; onDragStart: () => void; onDragEnd: () => void;
}) {
  const controls = useDragControls();
  return <Reorder.Item value={stage} dragMomentum={false} dragListener={false} dragControls={controls} onDragStart={onDragStart} onDragEnd={onDragEnd} className="relative flex items-center gap-2 sm:gap-3" whileDrag={{ zIndex: 10 }}>
    <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-slate-400">{index + 1}.</span>
    <article className={`flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border ${panel}`}>
      <button type="button" aria-label={`Drag ${stage.name} to reorder; use arrow buttons for keyboard reordering`} disabled={disabled} onPointerDown={event => { if (!disabled) controls.start(event); }} className="flex w-9 shrink-0 touch-none cursor-grab items-center justify-center border-r border-slate-800 bg-cyan-950/30 text-slate-400 hover:text-cyan-300 active:cursor-grabbing disabled:opacity-40"><GripVertical size={18} /></button>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h2 className="break-words text-sm font-semibold text-slate-100">{stage.name}</h2><p className="mt-1 break-words text-xs text-slate-400" style={role ? { color: role.color_code ?? DEFAULT_ROLE_COLOR } : undefined}>{role ? `${role.subname} - ${role.name}` : 'Role unavailable'}</p></div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={`Move ${stage.name} up`} disabled={disabled || dragging || index === 0} circle onClick={() => onMove(-1)}><ChevronUp size={16} /></IconButton>
          <IconButton label={`Move ${stage.name} down`} disabled={disabled || dragging || index === count - 1} circle onClick={() => onMove(1)}><ChevronDown size={16} /></IconButton>
          <span className="mx-1 h-5 border-l border-slate-700" />
          <IconButton label={`Edit stage ${stage.name}`} disabled={disabled || dragging} onClick={onEdit}><Pencil size={15} /></IconButton>
          <IconButton label={`Delete stage ${stage.name}`} disabled={disabled || dragging} destructive onClick={onDelete}><Trash2 size={15} /></IconButton>
        </div>
      </div>
    </article>
  </Reorder.Item>;
}
function IconButton({ label, disabled, onClick, children, circle, destructive }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode; circle?: boolean; destructive?: boolean }) {
  return <Button type="button" size="icon" variant="ghost" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`h-8 w-8 ${circle ? 'rounded-full border border-slate-700' : 'rounded-lg'} ${destructive ? 'text-slate-400 hover:bg-red-950/50 hover:text-red-300' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'}`}>{children}</Button>;
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center"><h2 className="text-sm font-semibold text-slate-200">{title}</h2><p className="mt-2 text-xs text-slate-400">{description}</p></div>;
}
