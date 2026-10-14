"use client";

import Image from "next/image";
import { isImageAttachment } from "@/lib/activityCommentAttachments";
import { requestJson } from "@/lib/request-json";
import { useActionPending } from "@/hooks/use-action-pending";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Download, FileText, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
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
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const preview = documents.find(document => document.storagePath === previewPath);
  const fileUrl = (document: ActivityDocument) => `/api/task/activity-files?${new URLSearchParams({ taskId, storagePath: document.storagePath })}`;
  useActionPending(busy);

  const chooseFiles = () => inputRef.current?.click();
  const upload = async (files: FileList | null) => {
    if (!files?.length || busy) return;
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
    const failed: string[] = [];
    try {
      for (const file of selected) {
        try {
          const form = new FormData();
          form.append("file", file);
          const result = await requestJson(`/api/task/activity-files?taskId=${taskId}`, { method: "POST", body: form });
          if (!result.file?.storagePath) throw new Error("The server did not confirm the upload. Please try again.");
          uploaded.push(result.file);
        } catch (error) {
          failed.push(`${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`);
        }
      }
      // Keep successful files when another file in the selection fails.
      if (uploaded.length) await onChange([...documents, ...uploaded]);
      if (failed.length) toast.error(uploaded.length ? `${uploaded.length} file(s) uploaded; ${failed.length} failed.` : "Files could not be uploaded", { description: failed.join("\n") });
    } catch (error) {
      // A failed response can follow a committed save; never delete possibly attached files here.
      toast.error(error instanceof Error ? error.message : "Unable to save documents");
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
          {isImageAttachment(document) ? <button type="button" disabled={busy} aria-label={`Preview ${document.name}`}
            onClick={event => { previewTrigger.current = event.currentTarget; setPreviewStatus("loading"); setPreviewPath(document.storagePath); }}
            className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-950/70 text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <DocumentThumbnail src={fileUrl(document)} name={document.name} />
          </button> : <a href={`${fileUrl(document)}&download=1`} aria-label={`Download ${document.name}`} target="_blank" rel="noreferrer" className="flex h-20 items-center justify-center rounded-lg bg-slate-950/70 text-cyan-300 hover:text-cyan-200">
            <FileText size={34} />
          </a>}
          <p className="mt-2 truncate text-center text-[11px] text-slate-400" title={document.name}>{document.name}</p>
          {editable && <button type="button" disabled={busy} onClick={() => void remove(document)} className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/90 p-1.5 text-rose-400 hover:bg-rose-950" aria-label={`Delete ${document.name}`}><Trash2 size={13} /></button>}
        </div>
      ))}
    </div>
  ) : <p className="py-8 text-center text-sm text-slate-500">No documents attached.</p>;

  const viewer = <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreviewPath(null); }}>
    <DialogContent onCloseAutoFocus={event => { if (previewTrigger.current?.isConnected) { event.preventDefault(); previewTrigger.current.focus(); } }}
      className="flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden border-slate-800 bg-slate-950 p-4 text-slate-100 sm:p-6">
      <DialogHeader className="pr-8 text-left"><DialogTitle className="truncate text-base" title={preview?.name}>{preview?.name || "Image preview"}</DialogTitle><DialogDescription>Image preview</DialogDescription></DialogHeader>
      {preview && <>
        <Button asChild variant="outline" className="w-fit shrink-0"><a href={`${fileUrl(preview)}&download=1`} target="_blank" rel="noreferrer"><Download className="mr-2 size-4" />Download</a></Button>
        <div className="relative h-[65dvh] min-h-0 shrink overflow-hidden rounded-xl bg-black/40">
          {previewStatus === "loading" && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="size-5 animate-spin" />Loading image…</div>}
          {previewStatus === "error" ? <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-400"><p>This image could not be loaded. Check your connection or try downloading it.</p><Button variant="outline" onClick={() => setPreviewStatus("loading")}>Retry preview</Button></div> :
            <Image key={preview.storagePath} src={fileUrl(preview)} alt={preview.name} fill unoptimized sizes="100vw" className="object-contain" onLoad={() => setPreviewStatus("ready")} onError={() => setPreviewStatus("error")} />}
        </div>
      </>}
    </DialogContent>
  </Dialog>;

  if (variant === "chip") return (
    <><Dialog>
      <DialogTrigger asChild><button type="button" className="rounded-full border border-cyan-700/60 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:border-cyan-400"><Paperclip className="mr-1 inline size-3" />Documents +{documents.length}</button></DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle>Documents</DialogTitle><DialogDescription className="text-slate-400">Preview images or download files attached to this activity.</DialogDescription></DialogHeader>
        {list}
        {editable && <div>{input}<Button type="button" variant="outline" disabled={busy} onClick={chooseFiles}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Add files</Button></div>}
      </DialogContent>
    </Dialog>{viewer}</>
  );

  return <><div className="shrink-0 space-y-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-3">{editable && input}<div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-300">Attachments</p>{editable && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={chooseFiles}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Paperclip className="mr-2 size-4" />}Attach files</Button>}</div>{list}</div>{viewer}</>;
}

function DocumentThumbnail({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <FileText size={34} /> : <Image src={src} alt={name} fill unoptimized sizes="(max-width: 640px) 50vw, 200px" className="object-cover transition-transform hover:scale-105" onError={() => setFailed(true)} />;
}
