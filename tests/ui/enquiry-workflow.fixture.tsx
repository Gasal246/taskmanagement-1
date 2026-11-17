import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import Page from '@/app/(admin)/admin/enquiries/manage-stages/page';
import { createQueryClient } from '@/query/create-query-client';
import { applyWorkflowChange, workflowChangeSchema, type EnquiryWorkflow } from '@/lib/enquiries/workflow';
const business = '111111111111111111111111';
const state = (window as any).workflowChecks = { saved: [] as any[], fail: false, errors: [] as string[], nextId: 1, workflow: { client_id: business, revision: 0, roles: [], stages: [] } as EnquiryWorkflow };
window.fetch = async (_url, init) => {
  if (!init?.method) return Response.json(state.workflow);
  const input = workflowChangeSchema.parse(JSON.parse(String(init.body)));
  state.saved.push(input);
  if (state.fail) return Response.json({ message: 'Test save failed' }, { status: 503 });
  try {
    state.workflow = applyWorkflowChange(state.workflow, input, (state.nextId++).toString(16).padStart(24, '0'), new Date().toISOString());
    return Response.json(state.workflow);
  } catch (error: any) { return Response.json({ message: error.message }, { status: error.status }); }
};
const client = createQueryClient(message => state.errors.push(message));
const store = configureStore({ reducer: () => ({ user: { businessData: { _id: business } } }) });
createRoot(document.getElementById('root')!).render(<SessionProvider session={{ user: { id: '222222222222222222222222' }, expires: '2099-01-01' } as any}><Provider store={store}><QueryClientProvider client={client}><Page /><Toaster /></QueryClientProvider></Provider></SessionProvider>);
