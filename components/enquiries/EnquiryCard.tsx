"use client";
import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import EnquiryCompletionActions, { enquiryDate } from "./EnquiryCompletionActions";
import { isCompleted } from "@/lib/enquiries/completion";

export default function EnquiryCard({ enquiry: e, number, basePath, staff = false }: { enquiry: any; number: number; basePath: string; staff?: boolean }) {
  const complete = isCompleted(e);
  return <article className={`group relative rounded-xl border bg-gradient-to-br from-slate-900/90 to-slate-950 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-cyan-500 ${complete ? "border-emerald-900/70 hover:border-emerald-600/70" : "border-slate-700 hover:border-cyan-700"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <Link href={`${basePath}/${e._id}`} className="min-w-0 flex-1 rounded-md outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400">
        <div className="flex items-center gap-2 text-xs text-slate-400"><Building2 size={15} /><span>{String(number).padStart(2, "0")} · {e.enquiry_uuid || "Enquiry"}</span></div>
        <h2 className="mt-2 break-words text-base font-semibold text-slate-100 group-hover:text-cyan-100">{e.camp_id?.camp_name || "Camp not linked"} <ArrowUpRight size={16} className="inline text-slate-500" /></h2>
      </Link>
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        {!e.is_active && <span className="rounded-full border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-amber-200">Awaiting approval</span>}
        <span className={`rounded-full border px-2.5 py-1 ${complete ? "border-emerald-700 bg-emerald-950/60 text-emerald-200" : "border-slate-700 bg-slate-800 text-slate-300"}`}>{complete ? "Completed" : "In progress"}</span>
      </div>
    </div>
    <dl className="my-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
      {[["Status", e.status || "Not set"], ["Priority", staff ? e.forwarded_priority ?? e.priority : e.priority], ["Occupancy", e.camp_id?.camp_occupancy ?? "Not specified"], ["WiFi", e.wifi_available === true ? "Yes" : e.wifi_available === false ? "No" : "Not specified"], ["Due date", enquiryDate(e.due_date)]].map(([label, value]) => <div key={label}><dt className="mb-1 text-slate-500">{label}</dt><dd className="break-words font-medium text-slate-200">{value || "Not set"}</dd></div>)}
    </dl>
    <div className="relative z-10 space-y-3 border-t border-slate-800 pt-3">
      <EnquiryCompletionActions enquiry={e} basePath={basePath} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400"><span>Created at: {enquiryDate(e.createdAt)}</span><span>Recent Update At: {enquiryDate(e.updatedAt)}</span></div>
    </div>
  </article>;
}
