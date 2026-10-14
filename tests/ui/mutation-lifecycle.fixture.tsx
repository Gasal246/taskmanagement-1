import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { createQueryClient } from "@/query/create-query-client";
import PendingActionGuard from "@/components/shared/PendingActionGuard";
import { useActionPending } from "@/hooks/use-action-pending";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const state = (window as any).mutationChecks = { writes: 0, clicks: 0, value: 'Before', errors: [] as string[], fail: false, refresh: false };
const client = createQueryClient(message => state.errors.push(message));
client.setQueryData(['fixture'], 'Before');
function Fixture() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  useActionPending(uploading);
  const query = useQuery({ queryKey: ['fixture'], queryFn: async () => {
    state.refresh = true;
    await new Promise(resolve => { (window as any).finishRefresh = resolve; });
    state.refresh = false;
    return state.value;
  } });
  const mutation = useMutation({ mutationFn: async () => {
    state.writes++;
    await new Promise(resolve => { (window as any).finishSave = resolve; });
    if (state.fail) throw new Error('Failed save');
    state.value = 'After';
    return { status: 200 };
  } });
  const save = <button id="save" onClick={() => mutation.mutate()}>Save</button>;
  return <main>
    <p id="value">{query.data}</p>
    <button id="other" onClick={() => state.clicks++}>Other action</button>
    <button id="open" onClick={() => setOpen(true)}>Open approval dialog</button>
    <button id="upload" onClick={() => { setUploading(true); (window as any).finishUpload = () => setUploading(false); }}>Upload</button>
    {!open && save}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Approval</DialogTitle><DialogDescription>Confirm the action.</DialogDescription>{save}<button id="dialog-other" onClick={() => state.clicks++}>Conflicting action</button></DialogContent></Dialog>
  </main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><Fixture /><PendingActionGuard /></QueryClientProvider>);
