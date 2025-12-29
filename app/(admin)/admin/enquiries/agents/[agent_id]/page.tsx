"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, FileText, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "antd";
import { useActivateDeactivateEqAgents, useGetEqAgentByID, useRemoveEnquiryAgent } from "@/query/enquirymanager/queries";
import { formatDateTiny } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AgentDetailsPage() {
  const params = useParams<{ agent_id: string }>();
  const router = useRouter();
  const agentId = Array.isArray(params.agent_id) ? params.agent_id[0] : params.agent_id;

  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: agent, isLoading, refetch } = useGetEqAgentByID(agentId);
  const { mutateAsync: ActDect, isPending: isActivating } = useActivateDeactivateEqAgents();
  const { mutateAsync: RemoveAgent, isPending: isDeleting } = useRemoveEnquiryAgent();

  useEffect(() => {
    console.log("agents: ", agent);
  }, [agent]);

  const actDeactivateAgents = async () => {
    const res = await ActDect(params.agent_id);
    if (res?.status == 200) {
      toast.success(res?.message);
    }
    toast.error(res?.message);
    return refetch();
  }

  const deleteAgents = async () => {
    const res = await RemoveAgent(params.agent_id);
    if (res?.status == 200) {
      toast.success(res?.message);
      return router.replace("/admin/enquiries/agents");
    }
    toast.error(res?.message || "Failed to Remove Agent");
  }


  return (
    <div className="p-6 text-slate-200">

      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.replace("/admin/enquiries/agents")}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* Header */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 flex flex-col gap-4 border border-slate-700">
        <div className="flex items-start gap-4">
          <Avatar size={60} src="https://api.dicebear.com/7.x/personas/svg" />

          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={18} /> {agent?.agent?.name}
            </h2>
            <p className="text-sm text-slate-400">{agent?.agent?.email}</p>
            <p className="text-sm text-slate-400">{agent?.agent?.phone}</p>
            <p className="text-sm text-slate-400">
              Contract Number: {agent?.agentDetails?.contract_no}
            </p>
            <p className="text-sm text-slate-400">
              Contract Expiry: {formatDateTiny(agent?.agentDetails?.contract_expiry)}
            </p>
            <p className="text-sm text-slate-400">
              Country: {agent?.agentDetails?.country_id?.country_name} | Region:{" "}
              {agent?.agentDetails?.region_id?.region_name}
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/admin/enquiries/agents/${agentId}/docs`)}
              className="flex items-center gap-2 bg-cyan-900/70 hover:bg-cyan-800/80 text-cyan-100 border border-cyan-700 rounded-md px-3 py-2 text-sm font-semibold"
            >
              <FolderOpen size={16} />
              View Documents
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={actDeactivateAgents}
              className="flex items-center justify-center gap-2 bg-amber-900/70 hover:bg-amber-800/80 text-amber-100 border border-amber-700 rounded-md px-3 py-2 text-sm font-semibold"
            >
              {agent?.agent?.status === 1 ? "Deactivate" : "Activate"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={()=> setDeleteModalOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 bg-rose-900/70 hover:bg-rose-800/80 text-rose-100 border border-rose-700 rounded-md px-3 py-2 text-sm font-semibold"
            >
              Delete
            </motion.button>
          </div>
        </div>
      </div>


      <div className="bg-gradient-to-tr space-y-2 mb-5 from-slate-950/50 to-slate-900/50 p-4 rounded-lg border border-slate-800">
        <p className="text-md text-slate-100">On Going Enquiries: {agent?.onGoing}</p>
        <p className="text-md text-slate-100">Closed Enquiries: {agent?.closed}</p>
      </div>

      {/* Enquiries */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 rounded-lg border border-slate-800">
        <h3 className="text-md font-semibold flex items-center gap-2 mb-3">
          <FileText size={16} /> Enquiries Handled ({agent?.enquiries?.length})
        </h3>

        {agent?.enquiries?.length === 0 ? (
          <p className="text-sm text-slate-500">No enquiries assigned.</p>
        ) : (
          <div className="space-y-2">
            {agent?.enquiries?.map((enq: any) => (
              <motion.div
                key={enq._id}
                onClick={() => router.push(`/admin/enquiries/${enq._id}`)}
                className="border border-slate-700 hover:border-slate-500 p-3 rounded-lg cursor-pointer bg-slate-900/40"
              >
                <h4 className="font-medium text-sm">{enq?.camp_id?.camp_name}</h4>
                <p className="text-xs text-slate-400">
                  Status: {enq.status} | Created: {formatDateTiny(enq?.createdAt)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>

          <p className="text-red-400 font-semibold">Proceeding with this action will remove the agent from enquiry manager.</p>

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={deleteAgents}>{isDeleting ? "Deleting" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
