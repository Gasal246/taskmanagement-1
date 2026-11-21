import React from 'react';
import { createRoot } from 'react-dom/client';
import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useForm, FormProvider } from 'react-hook-form';
import { Toaster } from 'sonner';
import EnquiryWorkflowProgress from '@/components/enquiries/EnquiryWorkflowProgress';
import EnquiryWorkflowFields from '@/components/enquiries/EnquiryWorkflowFields';
import { createQueryClient } from '@/query/create-query-client';
import { workflowProgress } from '@/lib/enquiries/workflow-progress';
const id = (n: number) => String(n).padStart(24, '0');
const roles = [{ _id: id(2), subname: 'AM', name: 'Account Manager', color_code: '#67e8f9' }, { _id: id(3), subname: 'CD', name: 'Commercial Director', color_code: '#c4b5fd' }];
const config: any = { client_id: id(1), revision: 1, roles, stages: Array.from({ length: 12 }, (_, i) => ({ _id: id(i + 30), name: `Stage ${i + 1}`, role_id: roles[i % 2]._id })) };
const state = (window as any).progressChecks = { admin: true, actorId: id(10), fail: false, writes: [] as any[], enquiry: { _id: id(20), business_id: id(1), workflow_current_stage: 6, workflow_revision: 1, workflow_assignments: [{ role_id: roles[0]._id, user_ids: [id(10)] }, { role_id: roles[1]._id, user_ids: [id(11)] }] }, errors: [] as string[] };
window.fetch = async (url, init) => {
  if (String(url).includes('/transition')) {
    const input = JSON.parse(String(init?.body)); state.writes.push(input);
    if (state.fail) return Response.json({ message: 'Test workflow save failed' }, { status: 503 });
    state.enquiry.workflow_current_stage = input.operation === 'reopen' ? input.stage_number : input.stage_number + 1;
    state.enquiry.workflow_revision++;
    return Response.json({ message: 'Saved' });
  }
  return Response.json(config);
};
const client = createQueryClient(message => state.errors.push(message));
function Fixture() {
  const query = useQuery({ queryKey: ['progress-fixture'], queryFn: async () => JSON.parse(JSON.stringify({ ...state.enquiry, workflow: workflowProgress(state.enquiry, config, state.actorId, state.admin) })) });
  const form = useForm({ defaultValues: {} });
  return <div className="space-y-4 p-4 text-slate-100"><div className="flex gap-3"><button id="staff" onClick={() => { state.admin = false; void client.invalidateQueries(); }}>Staff</button><button id="admin" onClick={() => { state.admin = true; void client.invalidateQueries(); }}>Admin</button></div><div id="card" className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"><EnquiryWorkflowProgress enquiry={query.data} compact /></div><div id="view"><EnquiryWorkflowProgress enquiry={query.data} /></div><FormProvider {...form}><form><EnquiryWorkflowFields businessId={id(1)} enquiry={query.data} options={[{ id: id(10), name: 'Alice' }, { id: id(11), name: 'Bob' }, { id: id(12), name: 'Carol' }]} /></form></FormProvider><Toaster /></div>;
}
createRoot(document.getElementById('root')!).render(<SessionProvider session={{ user: { id: id(10) }, expires: '2099-01-01' } as any}><QueryClientProvider client={client}><Fixture /></QueryClientProvider></SessionProvider>);
