"use client";

import type { UseFormReturn } from "react-hook-form";
import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import CampClassificationFields from "./CampClassificationFields";
import CampSolutionsFields from "./CampSolutionsFields";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAPACITY_UNITS, OWNERSHIP_OPTIONS, PROJECT_STAGES, getCatalogueClassificationLabels, resolveSectorFieldValues } from "@/lib/enquiries/catalogue";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function EnquiryFacilityDetailsFields({
  form,
  isNewFacility,
  selectedFacility,
}: {
  form: UseFormReturn<any>;
  isNewFacility: boolean;
  selectedFacility?: any;
}) {
  const { data: catalogueData } = useGetEnquiryCatalogue();
  const catalogue = catalogueData?.catalogue || { project_sectors: [], solution_categories: [] };
  const option = (name: string, label: string, values: readonly string[]) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-xs font-semibold text-slate-300">{label}</FormLabel>
        <Select value={field.value || ""} onValueChange={field.onChange}>
          <FormControl><SelectTrigger className="border-slate-800 bg-slate-950/40"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger></FormControl>
          <SelectContent>{values.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );

  const labels = selectedFacility ? getCatalogueClassificationLabels(catalogue, selectedFacility) : null;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 via-slate-950/50 to-cyan-950/10 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl border border-cyan-900/70 bg-cyan-950/30 p-2 text-cyan-300"><Building2 size={18} /></span>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Facility Details</h3>
          <p className="mt-1 text-xs text-slate-400">{isNewFacility ? "Describe the Facility for administrator review and approval." : "Facility information is managed centrally. Solutions below apply to this enquiry."}</p>
        </div>
      </div>

      {isNewFacility ? <div className="space-y-4">
        <CampClassificationFields control={form.control} watch={form.watch} setValue={form.setValue} />
        <div className="grid gap-4 md:grid-cols-3">
          {option("project_stage", "Project Stage", PROJECT_STAGES)}
          {option("ownership", "Ownership", OWNERSHIP_OPTIONS)}
          {option("capacity_unit", "Capacity Unit", CAPACITY_UNITS)}
        </div>
      </div> : selectedFacility ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Summary label="Facility" value={selectedFacility.camp_name} />
        <Summary label="Project Sector" value={labels?.sector || selectedFacility.camp_type} />
        <Summary label="Facility Type" value={`${labels?.facility || selectedFacility.camp_type || "Not provided"}${selectedFacility.facility_type_detail ? ` — ${selectedFacility.facility_type_detail}` : ""}`} />
        {resolveSectorFieldValues(catalogue, selectedFacility).map((entry: any) => <Summary key={entry.field_key} label={entry.field_name} value={entry.value_name || entry.text_value} />)}
        <Summary label="Project Stage" value={selectedFacility.project_stage} />
        <Summary label="Ownership" value={selectedFacility.ownership} />
        <Summary label="Capacity" value={[selectedFacility.camp_capacity, selectedFacility.capacity_unit].filter(Boolean).join(" ")} />
        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 size={14} /> Approved Facility details are read-only in this enquiry.
        </div>
      </div> : <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400"><Clock3 size={14} /> Select a Facility to view its details.</div>}
    </div>

    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
      <CampSolutionsFields control={form.control} watch={form.watch} setValue={form.setValue} />
      {!isNewFacility && <p className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] text-slate-400">These selections are saved for this enquiry. Changes do not alter the Facility baseline.</p>}
    </div>
  </div>;
}

function Summary({ label, value }: { label: string; value?: unknown }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-xs font-medium text-slate-200">{value === null || value === undefined || value === "" ? "Not provided" : String(value)}</p>
  </div>;
}
