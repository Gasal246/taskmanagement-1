"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/config";
import { useAddUserDoc } from "@/query/user/queries";
import { FileText, UploadCloud, X } from "lucide-react";

type PendingDoc = {
  id: string;
  name: string;
  file: File;
  preview?: string;
  type: string;
};

interface AgentDocumentsModalProps {
  agentId: string;
  trigger: React.ReactNode;
  existingDocs?: any[];
  onUploaded?: () => Promise<void> | void;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const normalizeDocName = (name: string) => name.trim().replace(/\s+/g, " ");
const slugifyDocName = (name: string) =>
  normalizeDocName(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `file-${Date.now()}`;
const getFileExtension = (file: File) => {
  const ext = file?.name?.split(".").pop();
  if (ext && ext.length < 8) return ext.toLowerCase();
  if (file.type?.toLowerCase().includes("pdf")) return "pdf";
  if (file.type?.startsWith("image/")) return file.type.split("/")[1];
  return "bin";
};
const isAllowedFile = (file?: File | null) =>
  !!file && (file.type?.startsWith("image/") || file.type?.toLowerCase().includes("pdf"));

const AgentDocumentsModal = ({ agentId, trigger, existingDocs = [], onUploaded }: AgentDocumentsModalProps) => {
  const [open, setOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [queuedDocs, setQueuedDocs] = useState<PendingDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const { mutateAsync: addUserDoc } = useAddUserDoc();

  const resetForm = () => {
    setDocName("");
    setSelectedFile(null);
  };

  const handleAddToQueue = () => {
    const cleanedName = normalizeDocName(docName || selectedFile?.name || "");
    if (!cleanedName || !selectedFile) {
      toast.error("Please provide a document name and file.");
      return;
    }
    if (!isAllowedFile(selectedFile)) {
      toast.error("Only images or PDFs are allowed.");
      setSelectedFile(null);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File must be under 3MB.");
      setSelectedFile(null);
      return;
    }
    const duplicate =
      queuedDocs.some((doc) => doc.name.toLowerCase() === cleanedName.toLowerCase()) ||
      existingDocs?.some((doc: any) => doc?.doc_name?.toLowerCase?.() === cleanedName.toLowerCase());
    if (duplicate) {
      toast.error("A document with that name already exists.");
      return;
    }

    const preview = selectedFile.type.startsWith("image/") ? URL.createObjectURL(selectedFile) : undefined;
    const pendingDoc: PendingDoc = {
      id: `queued-${Date.now()}`,
      name: cleanedName,
      file: selectedFile,
      preview,
      type: selectedFile.type,
    };
    setQueuedDocs((prev) => [...prev, pendingDoc]);
    resetForm();
  };

  const removeQueuedDoc = (id: string) => {
    setQueuedDocs((prev) => {
      const doc = prev.find((item) => item.id === id);
      if (doc?.preview) URL.revokeObjectURL(doc.preview);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpload = async () => {
    if (!queuedDocs.length) {
      toast.error("Add at least one document to upload.");
      return;
    }
    if (!agentId) {
      toast.error("Missing agent id. Please reopen this page.");
      return;
    }
    setUploading(true);
    const failed: string[] = [];

    for (const doc of queuedDocs) {
      const extension = getFileExtension(doc.file);
      const safeName = slugifyDocName(doc.name);
      const storagePath = `agent/${agentId}/${safeName}/file.${extension}`;
      const storageRef = ref(storage, storagePath);
      let uploaded = false;

      try {
        await uploadBytes(storageRef, doc.file);
        uploaded = true;
        const url = await getDownloadURL(storageRef);

        const formData = new FormData();
        formData.append(
          "body",
          JSON.stringify({
            user_id: agentId,
            doc_name: doc.name,
            doc_url: url,
            doc_type: doc.type || doc.file.type,
            storage_path: storagePath,
          })
        );

        const res = await addUserDoc(formData);
        if (res?.status !== 200) {
          failed.push(doc.name);
          await deleteObject(storageRef);
        }
      } catch (error) {
        failed.push(doc.name);
        if (uploaded) {
          try {
            await deleteObject(storageRef);
          } catch (err) {
            console.log(err);
          }
        }
      }
    }

    if (failed.length === queuedDocs.length) {
      toast.error("Failed to upload documents.", { description: failed.join(", ") });
    } else if (failed.length) {
      toast.warning("Some documents failed to upload.", { description: failed.join(", ") });
    } else {
      toast.success("Documents uploaded successfully.");
    }

    setQueuedDocs((prev) => {
      prev.forEach((doc) => doc.preview && URL.revokeObjectURL(doc.preview));
      return [];
    });
    setUploading(false);
    setOpen(false);
    resetForm();
    if (onUploaded) {
      await onUploaded();
    }
  };

  useEffect(() => {
    if (!open) {
      setQueuedDocs((prev) => {
        prev.forEach((doc) => doc.preview && URL.revokeObjectURL(doc.preview));
        return [];
      });
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-slate-950 border border-slate-800 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Agent Documents</DialogTitle>
          <DialogDescription>Attach PDFs or images under 3MB. You can queue multiple files before uploading.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-200">Document Name</label>
            <Input
              placeholder='e.g. "Passport Front"'
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-200">Document File</label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <p className="text-[11px] text-slate-400">PDFs or images only. Max size 3MB.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleAddToQueue} className="border-slate-700">
              Add to list
            </Button>
            <Button type="button" onClick={handleUpload} disabled={uploading} className="flex items-center gap-2">
              <UploadCloud size={16} />
              {uploading ? "Uploading..." : queuedDocs.length ? `Upload ${queuedDocs.length}` : "Upload"}
            </Button>
          </div>

          {queuedDocs.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {queuedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="relative border border-slate-800 rounded-lg bg-slate-900/60 p-2 flex gap-2 items-center"
                >
                  <button
                    onClick={() => removeQueuedDoc(doc.id)}
                    className="absolute -right-2 -top-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full p-1"
                  >
                    <X size={14} />
                  </button>
                  {doc.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.preview} alt={doc.name} className="w-16 h-16 rounded-md object-cover border border-slate-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-md border border-slate-800 bg-slate-800/60 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200 leading-tight">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">{(doc.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentDocumentsModal;
