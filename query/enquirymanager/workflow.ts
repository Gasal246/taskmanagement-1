'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { EnquiryWorkflow, WorkflowInput } from '@/lib/enquiries/workflow';

async function request(path: string, init?: RequestInit): Promise<EnquiryWorkflow> {
  const response = await fetch(`/api/enquiries/workflow${path}`, { ...init, headers: { 'Content-Type': 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load enquiry workflow');
  return data;
}
export function useEnquiryWorkflow(clientId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['enquiry-workflow', session?.user?.id, clientId];
  const query = useQuery({ queryKey, queryFn: () => request(`?client_id=${clientId}`), enabled: Boolean(clientId && session?.user?.id) });
  const mutation = useMutation({
    meta: { refresh: false },
    mutationFn: ({ input, revision }: { input: WorkflowInput; revision: number }) => request('', {
      method: input.operation.startsWith('add_') ? 'POST' : input.operation.startsWith('delete_') ? 'DELETE' : 'PATCH',
      body: JSON.stringify({ ...input, client_id: clientId, revision }),
    }),
    onSuccess: async data => {
      queryClient.setQueryData(queryKey, data);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: async () => { await queryClient.invalidateQueries({ queryKey }); },
  });
  return { query, mutation };
}
