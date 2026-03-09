"use client";

import React from "react";
import { ArrowLeft, User, CalendarClock, MessageSquare, Flag, Download, Mail } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";
import { useGetEnquiryById, useGetEnquiryHistories } from "@/query/enquirymanager/queries";
import { Avatar } from "antd";

export default function EnquiryHistoryPage() {
  const params = useParams<{ enquiry_id: string }>();
  const { data: histories, isLoading } = useGetEnquiryHistories(params.enquiry_id);
  const { data: enquiryData } = useGetEnquiryById(params.enquiry_id);

  const renderAssignedUsers = (value: any) => {
    if (!value) return "Unassigned";
    const list = Array.isArray(value) ? value : [value];
    const names = list
      .map((item) => item?.name || item?.email || item)
      .filter(Boolean)
      .map((entry) => String(entry));
    return names.length ? names.join(", ") : "Unassigned";
  };

  const formatChangeValue = (value: any) => {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const renderActor = (actor: any) => actor?.name || actor?.email || "Unknown user";
  const getActor = (history: any) => history?.changed_by || history?.forwarded_by || null;
  const getActorInitial = (actor: any) => {
    const source = actor?.name || actor?.email || "?";
    return String(source).trim().charAt(0).toUpperCase() || "?";
  };

  const campName = enquiryData?.enquiry?.camp_id?.camp_name || "Unknown Camp";
  const enquiryUuid = enquiryData?.enquiry?.enquiry_uuid || params.enquiry_id;
  const historyList = histories?.histories ?? [];
  const forwardHistories = historyList.filter((history: any) => history?.change_type !== "ENQUIRY_EDIT");
  const updateHistories = historyList.filter((history: any) => history?.change_type === "ENQUIRY_EDIT");

  const handleExport = () => {
    const downloadedAt = new Date();

    const rows = historyList.map((h: any) => ([
      h.step_number ?? "",
      h.is_finished ? "Completed" : "In Progress",
      h.change_type ?? "FORWARD",
      h.priority ?? "",
      renderAssignedUsers(h.assigned_to),
      renderActor(h.changed_by || h.forwarded_by),
      Array.isArray(h.changed_fields) && h.changed_fields.length
        ? h.changed_fields
            .map((item: any) => `${item?.label || item?.field}: ${formatChangeValue(item?.from_value)} -> ${formatChangeValue(item?.to_value)}`)
            .join(" | ")
        : "",
      h.action ?? "",
      h.feedback ?? "",
      h.createdAt ? new Date(h.createdAt).toLocaleString() : "",
    ]));

    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Enquiry History Export"],
      ["Title", `${campName} - Enquiry ID: ${enquiryUuid}`],
      ["Camp Name", campName],
      ["Enquiry ID", enquiryUuid],
      ["Downloaded At", downloadedAt.toLocaleString()],
      [],
      ["Step Number", "Status", "Type", "Priority", "Assigned To", "Actor", "Changes", "Action", "Feedback", "Updated At"],
      ...rows,
    ]);

    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 60 },
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/admin/enquiries/${params.enquiry_id}`}>
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
          disabled={isLoading || !historyList.length}
          className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Forwards</h2>
          {forwardHistories.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-400">
              No Forward History for this enquiry
            </p>
          )}
          {forwardHistories.map((h: any) => (
            <motion.div
              key={h._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 p-4 rounded-lg border border-slate-700"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Step {h.step_number}</h3>

                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    h.is_finished ? "bg-green-700/70" : "bg-slate-700/70"
                  }`}
                >
                  {h.is_finished ? "Completed" : "In Progress"}
                </span>
              </div>

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
                  <User size={14} className="text-sky-400" />
                  <span>Updated By:</span>
                  <b>{renderActor(h.changed_by || h.forwarded_by)}</b>
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

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Updates</h2>
          {updateHistories.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-400">
              No Update History
            </p>
          )}
          {updateHistories.map((h: any) => (
            <motion.div
              key={h._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3"
            >
              <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950/40 p-3">
                <Avatar src={getActor(h)?.avatar_url || undefined} size={36}>
                  {getActorInitial(getActor(h))}
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Updated By</p>
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {renderActor(getActor(h))}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                    <Mail size={12} />
                    {getActor(h)?.email || "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-950/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-300">Field Changes</p>
                {Array.isArray(h.changed_fields) && h.changed_fields.length > 0 ? (
                  h.changed_fields.map((change: any, index: number) => (
                    <p key={`${change?.field || "field"}-${index}`} className="text-xs text-slate-300">
                      <span className="font-semibold text-slate-200">{change?.label || change?.field}:</span>{" "}
                      <span className="text-rose-300">{formatChangeValue(change?.from_value)}</span>{" "}
                      <span className="text-slate-500">{"->"}</span>{" "}
                      <span className="text-emerald-300">{formatChangeValue(change?.to_value)}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No field-level changes captured.</p>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Updated At: {new Date(h.createdAt).toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
