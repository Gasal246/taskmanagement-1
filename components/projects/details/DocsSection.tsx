"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Files, Loader2, Upload, X } from "lucide-react";
import {
  useAddProjectDoc,
  useRemoveProjectDoc,
} from "@/query/business/queries";
import { toast } from "sonner";
import { useProjectSection } from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

const MAX_SIZE = 5 * 1024 * 1024;
const isImage = (type?: string) => Boolean(type?.startsWith("image/"));
const isPdf = (type?: string) => type === "application/pdf";
const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");
const slug = (name: string) =>
  cleanName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `file-${Date.now()}`;

const storagePathFromUrl = (url?: string) => {
  try {
    const encoded = url?.split("/o/")[1]?.split("?")[0];
    return encoded ? decodeURIComponent(encoded) : "";
  } catch {
    return "";
  }
};

export default function DocsSection({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const { data: session }: any = useSession();
  const docs = useProjectSection<any[]>(projectId, "docs");
  const [access, setAccess] = useState<"public" | "private">("public");
  const viewers = useProjectSection<any[]>(
    projectId,
    "document-viewers",
    canManage && access === "private"
  );
  const { mutateAsync: addDoc } = useAddProjectDoc();
  const { mutateAsync: removeDoc, isPending: removing } = useRemoveProjectDoc();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [selectedViewers, setSelectedViewers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setName("");
    setFile(null);
    setPreview("");
    setAccess("public");
    setSelectedViewers([]);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!isImage(selected.type) && !isPdf(selected.type)) {
      toast.error("Only images and PDF files are allowed.");
      return;
    }
    if (selected.size > MAX_SIZE) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(isImage(selected.type) ? URL.createObjectURL(selected) : "");
    if (!name) setName(cleanName(selected.name.replace(/\.[^/.]+$/, "")));
  };

  const handleUpload = async () => {
    const docName = cleanName(name);
    if (!file || !docName) {
      toast.error("Please provide a document name and file.");
      return;
    }
    if (access === "private" && selectedViewers.length === 0) {
      toast.error("Select at least one private viewer.");
      return;
    }
    if (
      (docs.data || []).some(
        (doc: any) => doc.doc_name?.toLowerCase() === docName.toLowerCase()
      )
    ) {
      toast.error("A document with this name already exists.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `project/${projectId}/${slug(docName)}/file.${extension}`;
    const storageRef = ref(storage, path);
    setUploading(true);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const body = new FormData();
      body.append(
        "body",
        JSON.stringify({
          project_id: projectId,
          doc_name: docName,
          doc_url: url,
          doc_type: file.type,
          storage_path: path,
          access_type: access,
          access_to: access === "private" ? selectedViewers : [],
          created_by: session?.user?.id,
        })
      );
      const response = await addDoc(body);
      if (response?.status !== 200) {
        await deleteObject(storageRef);
        toast.error(response?.error || "Unable to upload document.");
        return;
      }
      toast.success("Document uploaded.");
      reset();
      await docs.refetch();
    } catch (error) {
      console.log(error);
      try {
        await deleteObject(storageRef);
      } catch {}
      toast.error("Unable to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (doc: any) => {
    const response = await removeDoc(doc._id);
    if (response?.status !== 200) {
      toast.error("Unable to remove document.");
      return;
    }
    const path = doc.storage_path || storagePathFromUrl(doc.doc_url);
    if (path) {
      try {
        await deleteObject(ref(storage, path));
      } catch (error) {
        console.log("Document record removed; storage cleanup failed", error);
      }
    }
    toast.success("Document removed.");
    await docs.refetch();
  };

  if (docs.isPending) return <ProjectSectionSkeleton cards={5} />;
  if (docs.isError) return <ProjectSectionError onRetry={() => docs.refetch()} />;

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Files size={16} className="text-cyan-300" /> Project Documents
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Images or PDFs, up to 5MB. Private files are restricted to selected
          viewers and project managers.
        </p>
      </div>

      <div className={`mt-5 grid gap-5 ${canManage ? "lg:grid-cols-3" : ""}`}>
        {canManage && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/45 p-4">
            <p className="text-sm font-semibold text-slate-100">Add a document</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label>Document Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>File</Label>
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-300 hover:border-cyan-700">
                  <span className="flex items-center gap-2 truncate">
                    <Upload size={14} /> {file?.name || "Choose image or PDF"}
                  </span>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                {(["public", "private"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setAccess(value)}
                    className={`rounded-md border px-3 py-2 text-xs capitalize ${
                      access === value
                        ? "border-cyan-600 bg-cyan-950/60 text-cyan-200"
                        : "border-slate-700 text-slate-300"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {access === "private" && (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-800 p-2">
                  {viewers.isPending && (
                    <p className="text-xs text-slate-400">Loading viewers...</p>
                  )}
                  {(viewers.data || []).map((viewer: any) => (
                    <label
                      key={viewer._id}
                      className="flex cursor-pointer items-center gap-2 text-xs text-slate-200"
                    >
                      <Checkbox
                        checked={selectedViewers.includes(viewer._id)}
                        onCheckedChange={(checked) =>
                          setSelectedViewers((current) =>
                            checked
                              ? [...current, viewer._id]
                              : current.filter((id) => id !== viewer._id)
                          )
                        }
                      />
                      <span className="truncate">{viewer.name}</span>
                    </label>
                  ))}
                  {!viewers.isPending && (viewers.data || []).length === 0 && (
                    <p className="text-xs text-slate-500">
                      No project team members are available.
                    </p>
                  )}
                </div>
              )}
              {preview && (
                <div className="relative h-32 overflow-hidden rounded-lg border border-slate-800">
                  <Image src={preview} alt="Document preview" fill className="object-cover" />
                </div>
              )}
              {file && isPdf(file.type) && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 p-3 text-xs text-slate-300">
                  <FileText size={16} className="text-amber-300" /> PDF ready to
                  upload
                </div>
              )}
              <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </div>
        )}

        <div className={canManage ? "lg:col-span-2" : ""}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(docs.data || []).map((doc: any) => {
              const pdf = isPdf(doc.doc_type) || doc.doc_url?.toLowerCase?.().includes(".pdf");
              return (
                <div
                  key={doc._id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/45"
                >
                  <div className="relative flex h-32 items-center justify-center bg-slate-950">
                    {!pdf && doc.doc_url ? (
                      <Image
                        src={doc.doc_url}
                        alt={doc.doc_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <FileText size={30} className="text-amber-300" />
                    )}
                    {canManage && (
                      <button
                        type="button"
                        aria-label={`Remove ${doc.doc_name}`}
                        disabled={removing}
                        onClick={() => handleRemove(doc)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-red-200"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {doc.doc_name}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 capitalize text-slate-300">
                        {doc.access_type || "public"}
                      </span>
                      <a
                        href={doc.doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 hover:text-cyan-200"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {(docs.data || []).length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
              No documents are available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
