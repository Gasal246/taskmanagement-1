"use client";

import { Building2, CalendarDays, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EMPTY_ENQUIRY_CATALOGUE,
  getCatalogueClassificationLabels,
  getCatalogueServiceLabel,
} from "@/lib/enquiries/catalogue";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";
import { compactProjectSolutionKeys, projectCardTimeline } from "@/lib/projects/catalogue-display";

const MAX_VISIBLE_SOLUTIONS = 3;

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusBadge = (project: any) => {
  if (!project?.is_approved) {
    return {
      label: "Waiting for approval",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    };
  }
  if (project?.status === "completed") {
    return {
      label: "Completed",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    };
  }
  if (project?.status === "cancelled") {
    return {
      label: "Cancelled",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    };
  }
  return {
    label: "On going",
    className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  };
};

export default function ProjectListCard({ project, href }: { project: any; href: string }) {
  const router = useRouter();
  const { data } = useGetEnquiryCatalogue();
  const catalogue = data?.catalogue || EMPTY_ENQUIRY_CATALOGUE;
  const classification = getCatalogueClassificationLabels(catalogue, project);
  const status = statusBadge(project);
  const enquiryReference = project?.enquiry_uuid || project?.enquiry_id?.enquiry_uuid;
  const clientName = project?.client_id?.client_name
    || project?.facility_client_company_id?.client_company_name
    || "No client associated";
  const regionName = project?.facility_region_id?.region_name || project?.region_id?.region_name || "-";
  const areaName = project?.facility_area_id?.area_name || project?.area_id?.area_name || "-";
  const cityName = project?.facility_city_id?.city_name || "-";
  const compactSolutions = compactProjectSolutionKeys(project, MAX_VISIBLE_SOLUTIONS);
  const visibleSolutions = compactSolutions.visible;
  const remainingSolutions = compactSolutions.remaining;
  const classificationVisible = Boolean(project?.project_sector || project?.facility_type);
  const timeline = projectCardTimeline(project);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="group min-w-0 cursor-pointer rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/85 via-slate-950/65 to-cyan-950/15 p-4 transition hover:border-cyan-600/50 hover:shadow-[0_18px_50px_-34px_rgba(34,211,238,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-6 text-slate-100 sm:text-lg">
            {project?.project_name || "Untitled project"}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{clientName}</p>
          {enquiryReference && (
            <span className="mt-2 inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              Ref: {enquiryReference}
            </span>
          )}
        </div>
        <span className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {classificationVisible && (
        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/35 px-3 py-2 text-xs font-medium text-cyan-200">
          <Building2 size={15} className="shrink-0" />
          <span className="truncate">
            {[classification.sector, classification.facility]
              .filter(Boolean)
              .join(" › ")}
            {(project?.facility_type_detail || project?.facility_type_other)
              ? ` — ${project.facility_type_detail || project.facility_type_other}`
              : ""}
          </span>
        </div>
      )}

      {compactSolutions.total > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Solutions Required
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleSolutions.map((key) => {
              const primary = project?.primary_solution === key;
              return (
                <span
                  key={key}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                    primary
                      ? "border-cyan-500/70 bg-cyan-950/45 text-cyan-200"
                      : "border-slate-700 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  {primary && <Star size={12} fill="currentColor" className="shrink-0" />}
                  <span className="truncate">{getCatalogueServiceLabel(catalogue, key)}</span>
                </span>
              );
            })}
            {remainingSolutions > 0 && (
              <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
                +{remainingSolutions} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-x-5 gap-y-4 border-t border-slate-800 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <CardDetail label="Region" value={regionName} />
        <CardDetail label="Area" value={areaName} />
        <CardDetail label="City" value={cityName} />
        <CardDetail
          label="Occupancy / Capacity"
          value={`${project?.facility_occupancy ?? "-"} / ${project?.facility_capacity ?? "-"}`}
        />
        <CardDetail
          label="Priority"
          value={project?.priority || "normal"}
          capitalize
          indicator={priorityColour(project?.priority)}
        />
        <div>
          <p className="text-[11px] text-slate-500">Timeline</p>
          <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-200">
            <CalendarDays size={14} className="shrink-0 text-slate-500" />
            <span>
              {formatDate(timeline.start)} – {formatDate(timeline.end)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

function priorityColour(priority?: string) {
  if (priority === "high") return "bg-rose-400";
  if (priority === "low") return "bg-slate-400";
  return "bg-amber-400";
}

function CardDetail({
  label,
  value,
  capitalize = false,
  indicator,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  indicator?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 flex items-center gap-2 break-words font-medium text-slate-200 ${capitalize ? "capitalize" : ""}`}>
        {indicator && <span className={`size-2 shrink-0 rounded-full ${indicator}`} />}
        {value}
      </p>
    </div>
  );
}
