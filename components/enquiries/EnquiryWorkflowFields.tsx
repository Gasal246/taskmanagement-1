'use client';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEnquiryWorkflow } from '@/query/enquirymanager/workflow';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import EnquiryUserMultiSelect from './EnquiryUserMultiSelect';
import type { WorkflowSetup } from '@/lib/enquiries/workflow-progress';

export default function EnquiryWorkflowFields({ businessId, enquiry, options }: { businessId?: string; enquiry?: any; options: { id: string; name: string; email?: string; status?: number }[] }) {
  const { query } = useEnquiryWorkflow(businessId);
  const { watch, setValue } = useFormContext();
  const value = watch('workflow_setup') as WorkflowSetup | undefined;
  const initialized = useRef('');
  const config = query.data;
  useEffect(() => {
    if (!config?.stages.length || (enquiry && !enquiry._id)) return;
    const key = `${businessId}:${enquiry?._id || 'new'}`;
    if (initialized.current === key && value) return;
    initialized.current = key;
    setValue('workflow_setup', { assignments: (enquiry?.workflow_assignments || []).filter((a: any) => config.roles.some(r => r._id === String(a.role_id))).map((a: any) => ({ role_id: String(a.role_id), user_ids: a.user_ids.map((u: any) => String(u._id || u)) })), current_stage: Math.min(enquiry?.workflow_current_stage || 1, config.stages.length + 1), expected_revision: enquiry?.workflow_revision || 0, configuration_revision: config.revision });
  }, [businessId, config, enquiry, setValue, value]);
  return <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
    <h2 className="text-sm font-semibold text-slate-200">Enquiry Workflow</h2>
    {query.isLoading ? <p role="status" className="text-xs text-slate-400">Loading workflow…</p> : query.isError ? <p role="alert" className="text-sm text-red-300">Unable to load workflow. Reload before saving.</p> : !config?.stages.length ? <p className="text-xs text-slate-400">Configure enquiry stages for this business to enable workflow.</p> : value && <>
      <h3 className="text-xs font-semibold text-slate-300">Workflow users</h3>
      <div className="grid gap-3 md:grid-cols-2">{config.roles.map(role => {
        const assignment = value.assignments.find(a => a.role_id === role._id);
        const elsewhere = new Set(value.assignments.filter(a => a.role_id !== role._id).flatMap(a => a.user_ids));
        return <div key={role._id} className="space-y-2 rounded-lg border border-slate-800 p-3"><p className="text-xs font-semibold" style={{ color: role.color_code }}>{role.subname} - {role.name}</p>
          <EnquiryUserMultiSelect label={`Assign ${role.subname} users`} value={assignment?.user_ids || []} options={options.filter(o => o.status !== 0 && !elsewhere.has(o.id))} onChange={user_ids => setValue('workflow_setup', { ...value, assignments: [...value.assignments.filter(a => a.role_id !== role._id), { role_id: role._id, user_ids }] }, { shouldDirty: true })} />
        </div>;
      })}</div>
      <label className="block space-y-2 text-xs text-slate-300"><span>Current Stage</span><Select value={String(value.current_stage)} onValueChange={number => setValue('workflow_setup', { ...value, current_stage: Number(number) }, { shouldDirty: true })}><SelectTrigger aria-label="Current Stage" className="border-slate-700 bg-slate-900"><SelectValue /></SelectTrigger><SelectContent>{config.stages.map((s, i) => <SelectItem key={s._id} value={String(i + 1)}>{i + 1}. {s.name}</SelectItem>)}<SelectItem value={String(config.stages.length + 1)}>All stages completed</SelectItem></SelectContent></Select></label>
      <p className="text-xs text-slate-400">Stages before the current stage are completed. Each user can belong to one workflow role.</p>
    </>}
  </section>;
}
