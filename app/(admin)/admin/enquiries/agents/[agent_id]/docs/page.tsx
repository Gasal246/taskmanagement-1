"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import AgentDocumentsModal from "@/components/enquiries/AgentDocumentsModal";
import { toast } from "sonner";
import { useGetUserCompleteProfile, useRemoveUserDoc } from "@/query/user/queries";
import { useGetEqAgentByID } from "@/query/enquirymanager/queries";
import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/firebase/config";
import LoaderSpin from "@/components/shared/LoaderSpin";

const extractStoragePath = (url: string) => {
  try {
    const afterObject = url.split("/o/")[1];
    const encodedPath = afterObject?.split("?")[0];
    return encodedPath ? decodeURIComponent(encodedPath) : "";
  } catch (err) {
    return "";
  }
};

const isImageDoc = (doc: any) => {
  const type = (doc?.doc_type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const url = doc?.doc_url || "";
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url.split("?")[0] || "");
};

export default function AgentDocumentsPage() {
  const params = useParams<{ agent_id: string }>();
  const router = useRouter();
  const agentId = Array.isArray(params.agent_id) ? params.agent_id[0] : params.agent_id;
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);

  const { data: agentData } = useGetEqAgentByID(agentId);
  const { mutateAsync: getProfile } = useGetUserCompleteProfile();
  const { mutateAsync: removeUserDoc } = useRemoveUserDoc();

  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await getProfile(agentId);
      if (res?.status === 200) {
        setDocs(res?.user_docs || []);
      } else {
        toast.error(res?.error || "Failed to load documents.");
      }
    } catch (err) {
      toast.error("Unable to load documents right now.");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleRemoveDoc = async () => {
    if (!docToDelete) return;
    const target = docToDelete;
    setDocToDelete(null);
    const previous = [...docs];
    setDocs((prev) => prev.filter((doc) => doc?._id !== target?._id));

    const path = target?.storage_path || extractStoragePath(target?.doc_url || "");
    try {
      const res = await removeUserDoc(target?._id);
      if (res?.status !== 200) {
        setDocs(previous);
        toast.error(res?.error || "Failed to remove document.");
        return;
      }
      if (path) {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
      }
      toast.success("Document removed.");
    } catch (err) {
      setDocs(previous);
      toast.error("Failed to remove document.");
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchDocs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div className="p-5 pb-10 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push("/admin/enquiries/agents")}>agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push(`/admin/enquiries/agents/${agentId}`)}>agent</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>documents</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Uploaded Documents</p>
          <h2 className="text-lg font-semibold text-slate-100">
            {agentData?.agent?.name ? `${agentData.agent.name}'s documents` : "Agent documents"}
          </h2>
          <p className="text-xs text-slate-400">
            {docs?.length || 0} file{docs?.length === 1 ? "" : "s"} attached
          </p>
        </div>

        <AgentDocumentsModal
          agentId={agentId}
          existingDocs={docs}
          onUploaded={fetchDocs}
          trigger={
            <button className="flex items-center gap-2 bg-cyan-900/70 hover:bg-cyan-800/80 text-cyan-100 border border-cyan-700 rounded-md px-3 py-2 text-sm font-semibold">
              <Upload size={16} />
              Upload Document
            </button>
          }
        />
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 rounded-lg border border-slate-800 min-h-[40vh]">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} />
          <h3 className="text-sm font-semibold text-slate-200">Uploaded documents</h3>
        </div>

        {loadingDocs ? (
          <div className="flex justify-center items-center py-10">
            <LoaderSpin size={28} title="Fetching documents..." />
          </div>
        ) : docs?.length === 0 ? (
          <p className="text-sm text-slate-400">No Documents Uploaded For this Agent Yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((doc: any) => (
              <a
                key={doc?._id}
                href={doc?.doc_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 hover:border-cyan-700 transition-colors group"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDocToDelete(doc);
                  }}
                  className="absolute right-2 top-2 z-10 bg-black/60 hover:bg-black/80 text-slate-200 rounded-full p-1"
                >
                  <X size={14} />
                </button>

                <div className="h-40 w-full bg-slate-950/70 flex items-center justify-center overflow-hidden">
                  {isImageDoc(doc) && doc?.doc_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.doc_url} alt={doc?.doc_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
                      <FileText size={24} />
                      <p className="text-[11px]">PDF / Document</p>
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-1">
                  <p className="text-sm font-semibold text-slate-100 break-words">{doc?.doc_name}</p>
                  <p className="text-[11px] text-cyan-300 group-hover:text-cyan-200">Opens in a new tab</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="bg-slate-950 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{docToDelete?.doc_name}"? This will delete it from the collection and
              Firebase storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveDoc}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
