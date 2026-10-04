"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ACTIVITY_DOCUMENT_ACCEPT, ACTIVITY_DOCUMENT_MAX_BYTES, ActivityDocument,
  getActivityDocumentExtension, isAllowedActivityDocument,
} from "@/lib/activityDocuments";

type Props = {
  taskId: string;
  documents?: ActivityDocument[];
  onChange: (documents: ActivityDocument[]) => void | Promise<void>;
  editable?: boolean;
  variant?: "composer" | "chip";
};

export default function ActivityDocuments({ taskId, documents = [], onChange, editable = true, variant = "composer" }: Props) {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const chooseFiles = () => inputRef.current?.click();
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const userId = String(session?.user?.id || "");
    if (!userId) return toast.error("Your session could not be verified. Please sign in again.");
    if (documents.length + files.length > 20) return toast.error("An activity can have up to 20 documents.");
    const selected = Array.from(files);
    for (const file of selected) {
      const extension = getActivityDocumentExtension(file.name);
      if (!isAllowedActivityDocument(extension)) return toast.error(`${file.name} is not a supported document type.`);
      if (file.size <= 0) return toast.error(`${file.name} is empty.`);
      if (file.size > ACTIVITY_DOCUMENT_MAX_BYTES) return toast.error(`${file.name} is larger than 10MB.`);
    }
    setBusy(true);
    const uploaded: ActivityDocument[] = [];
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/task/activity-files?taskId=${taskId}`, { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to upload document");
        uploaded.push(result.file);
      }
      await onChange([...documents, ...uploaded]);
    } catch (error) {
      // A failed response can follow a committed save; never delete possibly attached files here.
      toast.error(error instanceof Error ? error.message : "Unable to upload documents");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (document: ActivityDocument) => {
    setBusy(true);
    try { await onChange(documents.filter((item) => item.storagePath !== document.storagePath)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to remove document"); }
    finally { setBusy(false); }
  };

  const input = <input ref={inputRef} type="file" multiple accept={ACTIVITY_DOCUMENT_ACCEPT} className="hidden" onChange={(event) => void upload(event.target.files)} />;
  const list = documents.length ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {documents.map((document) => (
        <div key={document.storagePath} className="group relative min-w-0 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <a href={`/api/task/activity-files?taskId=${taskId}&storagePath=${encodeURIComponent(document.storagePath)}&download=1`} aria-label={`Download ${document.name}`} target="_blank" rel="noreferrer" className="flex h-20 items-center justify-center rounded-lg bg-slate-950/70 text-cyan-300 hover:text-cyan-200">
            <FileText size={34} />
          </a>
          <p className="mt-2 truncate text-center text-[11px] text-slate-400" title={document.name}>{document.name}</p>
          {editable && <button type="button" disabled={busy} onClick={() => void remove(document)} className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/90 p-1.5 text-rose-400 hover:bg-rose-950" aria-label={`Delete ${document.name}`}><Trash2 size={13} /></button>}
        </div>
      ))}
    </div>
  ) : <p className="py-8 text-center text-sm text-slate-500">No documents attached.</p>;

  if (variant === "chip") return (
    <Dialog>
      <DialogTrigger asChild><button type="button" className="rounded-full border border-cyan-700/60 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:border-cyan-400"><Paperclip className="mr-1 inline size-3" />Documents +{documents.length}</button></DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle>Documents</DialogTitle><DialogDescription className="text-slate-400">Download files attached to this activity.</DialogDescription></DialogHeader>
        {list}
        {editable && <div>{input}<Button type="button" variant="outline" disabled={busy} onClick={chooseFiles}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Add files</Button></div>}
      </DialogContent>
    </Dialog>
  );

  return <div className="shrink-0 space-y-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-3">{input}<div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-300">Attachments</p><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={chooseFiles}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Paperclip className="mr-2 size-4" />}Attach files</Button></div>{documents.length > 0 && list}</div>;
}
