"use client";

import { ArrowRight } from "lucide-react";
import { formatDateTiny } from "@/lib/utils";

type AssignedTeam = {
  _id?: string;
  team_name?: string;
};

export default function ProjectTaskHeaderSummary({
  activityCount,
  completedActivityCount,
  teams,
  projectName,
  startDate,
  endDate,
}: {
  activityCount: number;
  completedActivityCount: number;
  teams: AssignedTeam[];
  projectName?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}) {
  const startLabel = formatDateTiny(startDate) || "N/A";
  const endLabel = formatDateTiny(endDate) || "N/A";

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <SummaryBox label="Activities">
        <p className="mt-1 text-base font-semibold text-slate-100">
          {activityCount}
        </p>
        <p className="text-xs text-slate-400">
          Completed {completedActivityCount}
        </p>
      </SummaryBox>

      <SummaryBox label="Teams Assigned">
        {teams.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {teams.map((team, index) => (
              <span
                key={team._id || `${team.team_name || "team"}-${index}`}
                className="max-w-full truncate rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 text-xs font-medium text-cyan-100"
                title={team.team_name || "Unnamed team"}
              >
                {team.team_name || "Unnamed team"}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium text-slate-400">
            No teams assigned
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {projectName || "Project"}
        </p>
      </SummaryBox>

      <SummaryBox label="Timeline">
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <TimelineEndpoint label="Start" value={startLabel} />
          <ArrowRight
            size={16}
            className="text-cyan-500/80"
            aria-hidden="true"
          />
          <TimelineEndpoint label="End" value={endLabel} align="right" />
        </div>
      </SummaryBox>
    </div>
  );
}

function SummaryBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function TimelineEndpoint({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-100" title={value}>
        {value}
      </p>
    </div>
  );
}
