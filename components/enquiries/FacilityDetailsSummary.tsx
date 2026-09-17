"use client";

import { Building2, Clock3 } from "lucide-react";
import { getCatalogueClassificationLabels, getCatalogueServiceLabel, resolveSectorFieldValues } from "@/lib/enquiries/catalogue";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function FacilityDetailsSummary({ camp, enquirySolutions, pending = false }: {
  camp?: any;
  enquirySolutions?: any;
  pending?: boolean;
}) {
  const { data: catalogueData } = useGetEnquiryCatalogue();
  const catalogue = catalogueData?.catalogue || { project_sectors: [], solution_categories: [] };
  const labels = getCatalogueClassificationLabels(catalogue, camp || {});
  const solutionLabels = (enquirySolutions?.solutions_required || []).map((code: string) => getCatalogueServiceLabel(catalogue, code));
  return <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Building2 size={18} className="text-cyan-300" /><h2 className="font-semibold text-slate-100">Facility Details</h2></div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${pending ? "border-amber-800 bg-amber-950/30 text-amber-200" : "border-emerald-900 bg-emerald-950/30 text-emerald-200"}`}>
        {pending && <Clock3 size={12} />}{pending ? "Pending admin approval" : "Approved Facility"}
      </span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Item label="Facility Name" value={camp?.camp_name} />
      <Item label="Project Sector" value={labels.sector || camp?.camp_type} />
      <Item label="Facility Type" value={`${labels.facility || camp?.camp_type || "Not provided"}${camp?.facility_type_detail ? ` — ${camp.facility_type_detail}` : ""}`} />
      {resolveSectorFieldValues(catalogue, camp).map((entry: any) => <Item key={entry.field_key} label={entry.field_name} value={entry.value_name || entry.text_value} />)}
      <Item label="Project Stage" value={camp?.project_stage} />
      <Item label="Ownership" value={camp?.ownership} />
      <Item label="Capacity" value={[camp?.camp_capacity, camp?.capacity_unit].filter(Boolean).join(" ")} />
      <Item label="Current Occupancy" value={camp?.camp_occupancy} />
    </div>
    <div className="mt-4 border-t border-slate-800 pt-4">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">Solutions for this enquiry</p>
      <p className="mt-2 text-sm text-slate-200">{solutionLabels.join(", ") || "Not specified"}</p>
      {(enquirySolutions?.solution_details || []).map((detail: any) => <p key={detail.solution_key} className="mt-1 text-xs text-slate-400">{getCatalogueServiceLabel(catalogue, detail.solution_key)}: {detail.value}</p>)}
      {enquirySolutions?.primary_solution && <p className="mt-1 text-xs text-slate-400">Primary: {getCatalogueServiceLabel(catalogue, enquirySolutions.primary_solution)}</p>}
      <p className="mt-1 text-xs text-slate-400">Commercial model: {enquirySolutions?.commercial_model || "To Be Determined"}</p>
    </div>
  </section>;
}

function Item({ label, value }: { label: string; value?: unknown }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3"><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{value === null || value === undefined || value === "" ? "Not provided" : String(value)}</p></div>;
}
