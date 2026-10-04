"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const endpoint = "/api/enquiries/head-office-requests";
const labels: Record<string, string> = { address: "Address", phone: "Contact number", geo_location: "Location", other_details: "Other details" };
const empty = { address: "", phone: "", geo_location: "", other_details: "" };
const selectClass = "w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-200";
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options); const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Unable to load head offices"); return data;
}
function Details({ value }: { value: any }) {
  return <dl className="space-y-1 text-xs text-slate-300">{Object.entries(labels).map(([key, label]) => <div key={key}><dt className="inline text-slate-500">{label}: </dt><dd className="inline whitespace-pre-wrap break-words">{value?.[key] || "—"}</dd></div>)}</dl>;
}
export default function HeadOfficeManager({ enquiryId, campId, draft = false, onChange, queueOnly = false, hideWithoutPending = false }: {
  enquiryId?: string; campId?: string; draft?: boolean; onChange?: (value: any) => void; queueOnly?: boolean; hideWithoutPending?: boolean;
}) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["head-office-requests", enquiryId || "", campId || ""], queryFn: () => api(`${endpoint}?${new URLSearchParams(enquiryId ? { enquiry_id: enquiryId } : campId ? { camp_id: campId } : {})}`) });
  const data = query.data;
  const [input, setInput] = useState<any>({ operation: "keep", proposed: empty });
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const change = (value: any) => { setInput(value); onChange?.(value); };
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["head-office-requests"] }); await client.invalidateQueries({ predicate: query => /enquiry|camp|head.?office/i.test(String(query.queryKey[0])) }); };
  const submit = async () => {
    setBusy(true);
    try {
      const result = await api(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input,
        business_id: data.business_id, enquiry_id: enquiryId || editing?.enquiry_id?._id,
        camp_ids: editing?.camp_ids?.map((camp: any) => camp._id), detach_camp_ids: editing?.detach_camp_ids?.map((camp: any) => camp._id || camp),
        request_id: editing?._id, revision: editing?.revision }) });
      toast.success(result.message); setEditing(null); change({ operation: "keep", proposed: empty }); await refresh();
    } catch (error: any) { toast.error(error.message); } finally { setBusy(false); }
  };
  const review = async (request: any, values: any) => {
    setBusy(true);
    try { await api(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: request._id, revision: request.revision, ...values }) }); toast.success("Head office request updated"); await refresh(); }
    catch (error: any) { toast.error(error.message); } finally { setBusy(false); }
  };
  if (query.isLoading && hideWithoutPending) return null;
  if (query.isLoading) return <p className="text-xs text-slate-400">Loading head office details…</p>;
  if (query.error) return <div role="alert" className="text-sm text-red-300">{query.error.message} <Button type="button" variant="outline" onClick={() => query.refetch()}>Retry</Button></div>;
  const current = data.current_office;
  const pending = data.requests?.some((request: any) => request.status === "pending");
  if (hideWithoutPending && !pending) return null;
  const showComposer = !queueOnly || editing;
  return <section onKeyDown={event => { if (!draft && event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); } }} className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
    <div><h3 className="text-sm font-semibold text-slate-100">Head Office{queueOnly ? " Requests" : ""}</h3><p className="mt-1 text-xs text-slate-400">Changes require admin approval. Approved details remain in use while a request is pending.</p></div>
    {current && !queueOnly && <div className="rounded-lg border border-slate-800 p-3"><p className="mb-2 text-xs font-semibold">Current approved head office</p><Details value={current} /></div>}
    {showComposer && <div className="space-y-3">
      <label className="block space-y-1 text-xs">Head office action
        <select aria-label="Head office action" className={selectClass} value={input.operation} disabled={busy || (pending && !editing && !draft) || (Boolean(editing) && !editing.enquiry_id)} onChange={event => change({ operation: event.target.value, office_id: current?._id || editing?.office_id, proposed: event.target.value === "edit" ? current || editing?.proposed || empty : empty })}>
          <option value="keep">{current ? "Keep current head office" : "No head office change"}</option>
          <option value="link">Select existing head office</option><option value="create">Request new head office</option>
          {(current || editing?.office_id) && <option value="edit">Request changes to current details</option>}
          {current && <option value="remove">Request removal of head office link</option>}
        </select>
      </label>
      {input.operation === "link" && <label className="block space-y-1 text-xs">Existing head office<select className={selectClass} aria-label="Existing head office" value={input.selected_office_id || ""} onChange={event => change({ ...input, selected_office_id: event.target.value })}><option value="">Choose a head office</option>{data.offices.map((office: any) => <option key={office._id} value={office._id}>{office.address || office.phone || "Head office"} — {office.phone}</option>)}</select></label>}
      {input.operation === "link" && input.selected_office_id && <Details value={data.offices.find((office: any) => office._id === input.selected_office_id)} />}
      {["create", "edit"].includes(input.operation) && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <label className="space-y-1 text-xs" key={key}>{label}<Input aria-label={`Head office ${label.toLowerCase()}`} maxLength={2000} value={input.proposed?.[key] || ""} onChange={event => change({ ...input, proposed: { ...input.proposed, [key]: event.target.value } })} /></label>)}</div>}
      {input.operation === "remove" && <p className="text-xs text-amber-200">Only this facility’s link will be removed after approval. The head office record will be retained.</p>}
      {input.operation !== "keep" && (draft ? <p className="text-xs text-cyan-300">Your request will be submitted when you save the enquiry.</p> : <div className="flex gap-2"><Button type="button" disabled={busy} onClick={submit}>{editing ? "Save revised request" : "Submit for approval"}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); change({ operation: "keep", proposed: empty }); }}>Cancel revision</Button>}</div>)}
    </div>}
    {!draft && <div className="space-y-3">{!data.requests.length && <p className="text-xs text-slate-400">No head office requests yet.</p>}{data.requests.map((request: any) => <RequestCard key={request._id} request={request} offices={data.offices} admin={data.is_admin} own={request.requested_by?._id === data.actor_id} busy={busy} review={values => review(request, values)} revise={() => { setEditing(request); change({ operation: request.operation, office_id: request.office_id, selected_office_id: request.selected_office_id, proposed: request.proposed }); }} />)}</div>}
  </section>;
}
function RequestCard({ request, offices, admin, own, busy, review, revise }: { request: any; offices: any[]; admin: boolean; own: boolean; busy: boolean; review: (value: any) => void; revise: () => void }) {
  const [approveFacility, setApproveFacility] = useState(false);
  const [note, setNote] = useState(""); const [resolution, setResolution] = useState(""); const [match, setMatch] = useState("");
  return <article className="space-y-3 rounded-lg border border-slate-800 p-3">
    <div className="flex flex-wrap justify-between gap-2 text-sm"><strong className="capitalize">{request.operation === "remove" ? "Remove link" : request.operation} head office</strong><span className="capitalize text-cyan-300">{request.status}</span></div>
    <p className="text-xs text-slate-400">Requested by {request.requested_by?.name || "Staff"} · {new Date(request.createdAt).toLocaleDateString()} · Revision {request.revision}{request.enquiry_id?.enquiry_uuid ? ` · ${request.enquiry_id.enquiry_uuid}` : ""}</p>
    <p className="text-xs">Facilities: {request.camp_ids.map((camp: any) => camp.camp_name).join(", ") || "Standalone head office"}</p>
    {request.detach_camp_ids?.length > 0 && <p className="text-xs text-amber-200">Also removes links for: {request.detach_camp_ids.map((camp: any) => camp.camp_name || camp).join(", ")}.</p>}
    <div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs font-semibold">Current / submitted baseline</p>{request.before_office ? <Details value={request.before_office} /> : request.current_offices?.length ? request.current_offices.map((office: any) => <Details key={office._id} value={office} />) : <p className="text-xs text-slate-400">No linked head office</p>}</div><div><p className="mb-1 text-xs font-semibold">Proposed</p>{request.operation === "remove" ? <p className="text-xs">No linked head office</p> : <Details value={request.operation === "link" ? request.selected_office : request.proposed} />}</div></div>
    {request.affected_facilities.length > 0 && <p className="text-xs text-amber-200">This head office is shared by: {request.affected_facilities.map((camp: any) => camp.camp_name).join(", ")}. Updating its details affects all of them.</p>}
    {request.review_note && <p className="text-xs">Admin note: {request.review_note}</p>}
    {request.reviewed_by?.name && <p className="text-xs text-slate-400">Reviewed by {request.reviewed_by.name}</p>}
    {request.status === "pending" && admin && <div className="space-y-2">
      {request.operation === "edit" && <select aria-label="Approval scope" className={selectClass} value={resolution} onChange={event => setResolution(event.target.value)}><option value="">Choose how to apply changes</option><option value="shared">Update the shared head office for all linked facilities</option>{request.camp_ids.length > 0 && <option value="separate">Create a separate head office for the requested facilities</option>}</select>}
      {request.operation === "create" && <select aria-label="Match existing head office" className={selectClass} value={match} onChange={event => setMatch(event.target.value)}><option value="">Create the proposed head office</option>{offices.map(office => <option key={office._id} value={office._id}>Use existing: {office.address || office.phone}</option>)}</select>}
      {request.pending_facility && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={approveFacility} onChange={event => setApproveFacility(event.target.checked)} />Approve the new facility and enquiry together with this request</label>}
      <Input aria-label="Admin review note" placeholder="Review note (required for rejection)" value={note} onChange={event => setNote(event.target.value)} />
      <div className="flex gap-2"><Button type="button" disabled={busy || (request.operation === "edit" && !resolution)} onClick={() => review({ decision: "approve", approve_facility: approveFacility, note, resolution, match_office_id: match || undefined })}>Approve</Button><Button type="button" variant="outline" disabled={busy || !note.trim()} onClick={() => review({ decision: "reject", note })}>Reject</Button></div>
    </div>}
    {request.status === "pending" && own && <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={revise}>Revise request</Button><Button type="button" variant="outline" disabled={busy} onClick={() => review({ decision: "withdraw" })}>Withdraw request</Button></div>}
  </article>;
}
