"use client";

import React from "react";
import { ArrowLeft, User, CalendarClock, MessageSquare, Flag, Download } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";
import { useGetAllEnquiryHistoryForStaffs, useGetEnquiryByIdForStaffs } from "@/query/enquirymanager/queries";


export default function EnquiryHistoryPage() {

    const params = useParams<{ enquiry_id: string }>();
    const {data: histories, isLoading} = useGetAllEnquiryHistoryForStaffs(params.enquiry_id);
    const { data: enquiryData } = useGetEnquiryByIdForStaffs(params.enquiry_id);

    const renderAssignedUsers = (value: any) => {
        if (!value) return "Unassigned";
        const list = Array.isArray(value) ? value : [value];
        const names = list
            .map((item) => item?.name || item?.email || item)
            .filter(Boolean)
            .map((entry) => String(entry));
        return names.length ? names.join(", ") : "Unassigned";
    };

    const campName = enquiryData?.enquiry?.camp_id?.camp_name || "Unknown Camp";
    const enquiryUuid = enquiryData?.enquiry?.enquiry_uuid || params.enquiry_id;

    const handleExport = () => {
      const historyList = histories?.histories ?? [];
      const downloadedAt = new Date();

      const rows = historyList.map((item: any) => {
        const h = item?.history_id ?? {};
        return [
          h.step_number ?? "",
          h.is_finished ? "Completed" : "In Progress",
          h.priority ?? "",
          renderAssignedUsers(h.assigned_to),
          h.action ?? "",
          h.feedback ?? "",
          h.createdAt ? new Date(h.createdAt).toLocaleString() : "",
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([
        ["Enquiry History Export"],
        ["Title", `${campName} - Enquiry ID: ${enquiryUuid}`],
        ["Camp Name", campName],
        ["Enquiry ID", enquiryUuid],
        ["Downloaded At", downloadedAt.toLocaleString()],
        [],
        ["Step Number", "Status", "Priority", "Assigned To", "Action", "Feedback", "Updated At"],
        ...rows,
      ]);

      worksheet["!cols"] = [
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 30 },
        { wch: 24 },
        { wch: 40 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "History");
      XLSX.writeFile(workbook, `enquiry-history-${String(enquiryUuid).replace(/[^a-zA-Z0-9-_]/g, "_")}.xlsx`);
    };

  return (
    <div className="p-5 text-slate-200">

      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href ={`/staff/enquiry/${params.enquiry_id}`}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-2 rounded-md bg-slate-800 border border-slate-600 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </motion.div>
          </Link>

          <h1 className="text-xl font-bold">Enquiry History</h1>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading || !(histories?.histories?.length)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          Export
        </button>
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
              <h2 className="text-lg font-semibold">Step {h.history_id?.step_number}</h2>

              <span
                className={`px-3 py-1 text-xs rounded-full ${
                  h.history_id?.is_finished ? "bg-green-700/70" : "bg-slate-700/70"
                }`}
              >
                {h.history_id?.is_finished ? "Completed" : "In Progress"}
              </span>
            </div>

            {/* DETAILS */}
            <div className="text-sm space-y-2">

              <p className="flex items-center gap-2 text-slate-300">
                <Flag size={14} className="text-cyan-400" />
                <span>Priority:</span>
                <b>{h.history_id?.priority}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <User size={14} className="text-blue-400" />
                <span>Assigned To:</span>
                <b>{renderAssignedUsers(h.history_id?.assigned_to)}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <CalendarClock size={14} className="text-purple-400" />
                <span>Action:</span>
                <b>{h.history_id?.action}</b>
              </p>

              <p className="flex items-center gap-2 text-slate-300">
                <MessageSquare size={14} className="text-emerald-400" />
                <span>Feedback:</span> {h.history_id?.feedback}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                Updated At: {new Date(h.history_id?.createdAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
