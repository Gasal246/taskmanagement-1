"use client";

import React, { useEffect } from "react";
import { ArrowLeft, User, CalendarClock, MessageSquare, Flag } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useGetEnquiryHistories } from "@/query/enquirymanager/queries";


export default function EnquiryHistoryPage() {

    const params = useParams<{ enquiry_id: string }>();
    const {data: histories, isLoading} = useGetEnquiryHistories(params.enquiry_id);

    useEffect(()=> {
        console.log("history: ", histories);
    }, [histories]);

    const renderAssignedUsers = (value: any) => {
        if (!value) return "Unassigned";
        const list = Array.isArray(value) ? value : [value];
        const names = list
            .map((item) => item?.name || item?.email || item)
            .filter(Boolean)
            .map((entry) => String(entry));
        return names.length ? names.join(", ") : "Unassigned";
    };

  return (
    <div className="p-5 text-slate-200">

      {/* HEADER */}
      <div className="flex items-center gap-2 mb-6">
        <Link href ={`/admin/enquiries/${params.enquiry_id}`}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 rounded-md bg-slate-800 border border-slate-600 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </motion.div>
        </Link>

        <h1 className="text-xl font-bold">Enquiry History</h1>
      </div>

      {/* HISTORY LIST */}
      <div className="space-y-4">
        {histories?.histories.map((h:any) => (
          <motion.div
            key={h._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 p-4 rounded-lg border border-slate-700"
          >
            {/* STEP HEADER */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Step {h.step_number}</h2>

              <span
                className={`px-3 py-1 text-xs rounded-full ${
                  h.is_finished ? "bg-green-700/70" : "bg-slate-700/70"
                }`}
              >
                {h.is_finished ? "Completed" : "In Progress"}
              </span>
            </div>

            {/* DETAILS */}
            <div className="text-sm space-y-2">

              <p className="flex items-center gap-2 text-slate-300">
                <Flag size={14} className="text-cyan-400" />
                <span>Priority:</span>
                <b>{h.priority}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <User size={14} className="text-blue-400" />
                <span>Assigned To:</span>
                <b>{renderAssignedUsers(h.assigned_to)}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <CalendarClock size={14} className="text-purple-400" />
                <span>Action:</span>
                <b>{h.action}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <MessageSquare size={14} className="text-emerald-400" />
                <span>Feedback:</span> {h.feedback}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                Updated At: {new Date(h.createdAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
