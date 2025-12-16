"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ListTree, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { useGetEqUserLogs } from "@/query/enquirymanager/queries";

export default function UserLogsPage() {
  const router = useRouter();
  const params = useParams<{ user_id: string }>();

  const [logs, setLogs] = useState<any[]>([]);

  const {data: user_logs, isLoading} = useGetEqUserLogs(params.user_id);

  useEffect(()=> {
    console.log("Logs: ", user_logs);
  },[user_logs]);

  return (
    <div className="p-6 text-slate-200">

      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ListTree size={20} /> User Logs
        </h1>
        <p className="text-slate-400 text-sm">
          Latest activities and actions performed by this user.
        </p>
      </div>

      {/* LOG LIST */}
      <div className="bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-4 rounded-lg border border-slate-800">
        {user_logs?.user_logs?.length === 0 ? (
          <p className="text-sm text-slate-500">No logs found for this user.</p>
        ) : (
          <div className="space-y-3">
            {user_logs?.user_logs?.map((log:any) => (
              <motion.div
                key={log._id}
                whileHover={{ scale: 1.01 }}
                className="p-4 border border-slate-700 rounded-lg bg-slate-900/40 hover:border-cyan-500 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm">
                    {log?.camp_id?.camp_name || "Unknown Camp"}
                  </h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <CalendarDays size={12} />
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-semibold text-slate-300">
                    Enquiry:
                  </span>{" "}
                  {/* {log.enquiry_id} */} Some enquiry
                </p>

                <p className="text-xs text-slate-300 mt-2 italic">
                  {log.log}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
