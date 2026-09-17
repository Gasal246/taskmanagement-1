"use client";

import { Building2, CheckCircle2, Layers3 } from "lucide-react";
import {
  EMPTY_ENQUIRY_CATALOGUE,
  getCatalogueClassificationLabels,
  getCatalogueServiceLabel,
} from "@/lib/enquiries/catalogue";
import { hasProjectCatalogueDetails } from "@/lib/projects/catalogue-display";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function ProjectCatalogueDetails({ project }: { project: any }) {
  const { data } = useGetEnquiryCatalogue();
  const catalogue = data?.catalogue || EMPTY_ENQUIRY_CATALOGUE;
  const solutionKeys = Array.isArray(project?.solutions_required)
    ? project.solutions_required.filter(Boolean)
    : [];

  if (!hasProjectCatalogueDetails(project)) return null;

  const labels = getCatalogueClassificationLabels(catalogue, project);
  const solutionDetails = new Map<string, string>(
    (Array.isArray(project?.solution_details) ? project.solution_details : []).map(
      (entry: any) => [String(entry.solution_key), String(entry.value || "")] as [string, string]
    )
  );

  return (
    <section className="mt-4 rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Building2 size={16} className="text-cyan-300" /> Project Classification &amp; Solutions
      </h2>

      {(project?.project_sector || project?.facility_type) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {project?.project_sector && (
            <DetailCard label="Project Sector" value={labels.sector || project.project_sector} />
          )}
          {project?.facility_type && (
            <DetailCard
              label="Facility Type"
              value={labels.facility || project.facility_type}
              detail={project?.facility_type_detail || project?.facility_type_other}
            />
          )}
        </div>
      )}

      {solutionKeys.length > 0 && (
        <div className={`${project?.project_sector || project?.facility_type ? "mt-5 border-t border-slate-800 pt-5" : "mt-4"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Layers3 size={15} className="text-emerald-300" /> Solutions Applied
            </h3>
            {project?.commercial_model && (
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                {project.commercial_model}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {solutionKeys.map((key: string) => {
              const isPrimary = project?.primary_solution === key;
              const detail = solutionDetails.get(key);
              return (
                <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-5 text-slate-100">
                      {getCatalogueServiceLabel(catalogue, key)}
                    </p>
                    {isPrimary && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                        <CheckCircle2 size={11} /> Primary
                      </span>
                    )}
                  </div>
                  {detail && <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function DetailCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}
