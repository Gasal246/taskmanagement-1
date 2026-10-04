"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ListPagination from "@/components/shared/ListPagination";
import VirtualHistoryList from "@/components/shared/VirtualHistoryList";
import EnquiryCompletionActions from "./EnquiryCompletionActions";
import EnquiryActionProgress from "./EnquiryActionProgress";
import EnquiryLifecycleHistory from "./EnquiryLifecycleHistory";
import { useGetEnquiryHistories } from "@/query/enquirymanager/queries";
import { GetEnquiryHistories, GetAllEnquiryHistoryForStaffs } from "@/query/enquirymanager/function";

const changeValue = (value: any): string => Array.isArray(value) ? value.map(changeValue).join(", ") : value == null || value === "" ? "N/A" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
const actorName = (actor: any) => actor?.name || actor?.email || "Unknown user";
const assignedNames = (value: any) => (Array.isArray(value) ? value : value ? [value] : []).map(actorName).join(", ") || "Unassigned";
const lifecycle = new Set(["ENQUIRY_COMPLETED", "ENQUIRY_REOPENED", "ACTION_COMPLETED", "ACTION_CANCELLED", "ACTION_REOPENED"]);
const HistoryCard = memo(function HistoryCard({ history: h }: { history: any }) {
  if (lifecycle.has(h.change_type)) return <EnquiryLifecycleHistory histories={[h]} />;
  const edited = h.change_type === "ENQUIRY_EDIT";
  return <article className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
    <h2 className="flex flex-wrap justify-between gap-2 font-semibold"><span>Step {h.step_number} · {edited ? "Enquiry updated" : "Forward / scheduled action"}</span><time className="text-xs font-normal text-slate-400">{h.createdAt ? new Date(h.createdAt).toLocaleString() : "Date unavailable"}</time></h2>
    <p className="text-sm text-slate-300">Recorded by: <b>{actorName(h.changed_by || h.forwarded_by)}</b></p>
    {(h.changed_by || h.forwarded_by)?.email && <p className="break-all text-xs text-slate-400">{(h.changed_by || h.forwarded_by).email}</p>}
    {edited ? <div className="space-y-2 text-sm">
      {(h.changed_fields || []).map((change: any, index: number) => <p key={`${change.field}-${index}`} className="break-words"><b>{change.label || change.field}:</b> <span className="text-rose-300">{changeValue(change.from_value)}</span> → <span className="text-emerald-300">{changeValue(change.to_value)}</span></p>)}
      {!h.changed_fields?.length && <p className="text-slate-400">No field-level changes captured.</p>}
    </div> : <>
      <EnquiryActionProgress action={h} />
      <div className="space-y-2 text-sm text-slate-300"><p>Priority: <b>{h.priority ?? "Not specified"}</b></p><p>Assigned to: <b>{assignedNames(h.assigned_to)}</b></p><p>Action: <b>{h.action || "Not specified"}</b></p><p className="whitespace-pre-wrap break-words">Feedback: {h.feedback || "None"}</p></div>
    </>}
  </article>;
});

export default function EnquiryHistoryPage({ mode }: { mode: "admin" | "staff" }) {
  const { enquiry_id: id } = useParams<{ enquiry_id: string }>();
  const [options, setOptions] = useState({ page: 1, kind: "all" });
  const { data, isLoading, isFetching, isError, refetch, isPlaceholderData } = useGetEnquiryHistories(id, options, mode);
  const [exporting, setExporting] = useState(false);
  const exportRequest = useRef<AbortController | null>(null);
  useEffect(() => { setOptions({ page: 1, kind: "all" }); return () => exportRequest.current?.abort(); }, [id, mode]);
  const rows = (data?.histories || []).map((row: any) => row.history_id || row);
  const enquiry = data?.enquiry;
  const basePath = mode === "admin" ? "/admin/enquiries" : "/staff/enquiry";

  const exportHistory = async (all: boolean) => {
    if (exportRequest.current) return;
    const controller = new AbortController();
    exportRequest.current = controller;
    setExporting(true);
    try {
      let records = rows;
      if (all) {
        records = [];
        const getPage = mode === "staff" ? GetAllEnquiryHistoryForStaffs : GetEnquiryHistories;
        const asOf = new Date().toISOString();
        for (let page = 1; ; page++) {
          const result = await getPage(id, { page, limit: 100, kind: options.kind, asOf }, controller.signal);
          if (result.pagination.total > 5000) throw new Error("This export exceeds 5,000 records. Select a history type or export individual pages.");
          records.push(...result.histories.map((row: any) => row.history_id || row));
          if (page >= result.pagination.pages) break;
        }
      }
      const XLSX = await import("xlsx");
      if (controller.signal.aborted) return;
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["Enquiry History Export"], ["Facility", enquiry?.camp_id?.camp_name || "Unknown Facility"],
        ["Enquiry ID", enquiry?.enquiry_uuid || id], ["Export Scope", `${all ? "All matching records" : "Current page"} · ${options.kind} · ${records.length} rows`],
        ["Downloaded At", new Date().toLocaleString()], [],
        ["Step Number", "Status", "Type", "Priority", "Assigned To", "Actor", "Changes", "Action", "Feedback", "Updated At"],
        ...records.map((h: any) => [h.step_number ?? "", h.is_finished ? "Completed" : "In Progress", h.change_type || "FORWARD", h.priority ?? "", assignedNames(h.assigned_to), actorName(h.changed_by || h.forwarded_by),
          (h.changed_fields || []).map((change: any) => `${change.label || change.field}: ${changeValue(change.from_value)} -> ${changeValue(change.to_value)}`).join(" | "),
          h.previous_action && h.previous_action !== h.action ? `${h.previous_action} -> ${h.action}` : h.action || "", h.feedback || "", h.createdAt ? new Date(h.createdAt).toLocaleString() : ""]),
      ]);
      worksheet["!cols"] = [12, 14, 20, 12, 30, 24, 60, 24, 40, 22].map(wch => ({ wch }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "History");
      XLSX.writeFile(workbook, `enquiry-history-${String(enquiry?.enquiry_uuid || id).replace(/[^a-zA-Z0-9-_]/g, "_")}-${all ? "all" : `page-${data?.pagination.page}`}.xlsx`);
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Could not export history. Please retry.");
    } finally {
      if (exportRequest.current === controller) { exportRequest.current = null; setExporting(false); }
    }
  };

  return <div className="space-y-5 p-4 text-slate-200 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Link href={`${basePath}/${id}`} aria-label="Back to enquiry" className="rounded-md border border-slate-700 p-2"><ArrowLeft size={18} /></Link><h1 className="text-xl font-bold">Enquiry History</h1></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={exporting || isFetching || isPlaceholderData || !rows.length} onClick={() => void exportHistory(false)}><Download size={16} className="mr-2" />Export page</Button><Button variant="outline" disabled={exporting || isFetching || isPlaceholderData || !rows.length} onClick={() => void exportHistory(true)}>{exporting ? "Exporting…" : "Export matching history"}</Button></div>
    </header>
    {exporting && <Button variant="outline" onClick={() => exportRequest.current?.abort()}>Cancel export</Button>}
    {enquiry && <EnquiryCompletionActions enquiry={enquiry} basePath={basePath} showFollowup={false} />}
    <div className="flex flex-wrap gap-2" aria-label="History filters">
      {[["all", "All"], ["forwards", "Forwards"], ["updates", "Updates"], ["completion", "Completion"]].map(([kind, label]) => <Button key={kind} size="sm" variant={options.kind === kind ? "default" : "outline"} aria-pressed={options.kind === kind} onClick={() => setOptions({ page: 1, kind })}>{label}</Button>)}
    </div>
    <p className="text-xs text-slate-400">Newest first. Full exports include up to 5,000 matching records.</p>
    <ListPagination pagination={data?.pagination} busy={isFetching || isPlaceholderData} onPage={page => setOptions(current => ({ ...current, page }))} label="history records" />
    {isError && <div role="alert" className="rounded-lg border border-rose-900 p-4">Could not load history. <Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>}
    {isLoading ? <div role="status" aria-label="Loading history" className="space-y-3">{[1, 2, 3].map(key => <div key={key} className="h-36 animate-pulse rounded-lg bg-slate-800" />)}</div> :
      rows.length ? <div aria-busy={isFetching}><VirtualHistoryList key={`${id}-${data?.pagination.page}-${options.kind}`} rows={rows} renderRow={history => <HistoryCard history={history} />} /></div> : !isError && <p className="rounded-lg border border-dashed border-slate-700 p-5 text-slate-400">No {options.kind === "all" ? "" : options.kind + " "}history available in your scope.</p>}
  </div>;
}
