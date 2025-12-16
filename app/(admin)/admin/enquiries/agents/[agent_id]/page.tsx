"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "antd";
import { useGetEqAgentByID } from "@/query/enquirymanager/queries";
import { formatDateTiny } from "@/lib/utils";

export default function AgentDetailsPage() {
  const params = useParams<{agent_id: string}>();
  const router = useRouter();

  const [enquiries, setEnquiries] = useState<any[]>([]);

  const {data: agent, isLoading} = useGetEqAgentByID(params.agent_id);

  useEffect(()=> {
    console.log("agents: ", agent);
  }, [agent]);


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
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 flex gap-4 items-center border border-slate-700">
        <Avatar size={60} src="https://api.dicebear.com/7.x/personas/svg" />

        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={18} /> {agent?.agent?.name}
          </h2>
          <p className="text-sm text-slate-400">{agent?.agent?.email}</p>
          <p className="text-sm text-slate-400">{agent?.agent?.phone}</p>
        </div>
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
            {agent?.enquiries?.map((enq:any) => (
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
    </div>
  );
}
