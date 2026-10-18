'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { TargetInput, TargetChange } from '@/lib/enquiries/targets';
export async function targetRequest(path = '', init?: RequestInit) {
  const response = await fetch(`/api/enquiries/targets${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load targets');
  return data;
}
export function useTargets(params: Record<string, string>, endpoint = '', enabled = true) {
  const { data: session } = useSession();
  return useQuery({ queryKey: ['enquiry-targets', session?.user?.id, endpoint, params], queryFn: () => targetRequest(`${endpoint}?${new URLSearchParams(params)}`), enabled: enabled && Boolean(session?.user?.id) });
}
export function useSaveTarget() {
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: TargetInput | TargetChange }) => targetRequest(id ? `/${id}` : '', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
    // The shared mutation cache refreshes lists and access capability flags.
    onError: () => {},
  });
}
export function useDeleteTarget() {
  return useMutation({ mutationFn: (id: string) => targetRequest(`/${id}`, { method: 'DELETE' }), onError: () => {} });
}
