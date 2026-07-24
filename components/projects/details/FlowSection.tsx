"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock3, ExternalLink, Workflow } from "lucide-react";
import { useProjectSection } from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function FlowSection({
  projectId,
  mode,
}: {
  projectId: string;
  mode: "admin" | "staff";
}) {
  const router = useRouter();
  const query = useProjectSection<any[]>(projectId, "flow");
  if (query.isPending) return <ProjectSectionSkeleton cards={3} />;
  if (query.isError) {
    return <ProjectSectionError onRetry={() => query.refetch()} />;
  }

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Workflow size={16} className="text-cyan-300" /> Project Flow
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            The latest project events, newest first.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/${mode}/projects/${projectId}/flows`)
          }
        >
          View All <ExternalLink className="ml-2 size-4" />
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {(query.data || []).map((log: any, index) => (
          <div className="relative pl-6" key={log._id}>
            <span className="absolute left-1 top-2 size-2.5 rounded-full bg-cyan-400" />
            {index < (query.data || []).length - 1 && (
              <span className="absolute left-[8px] top-5 h-full w-px bg-slate-800" />
            )}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-sm font-semibold text-slate-100">{log.Log}</p>
              {log.description && (
                <p className="mt-1 text-xs text-slate-400">{log.description}</p>
              )}
              <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
                <Clock3 size={12} /> {formatDate(log.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {(query.data || []).length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
            No project activity has been recorded.
          </div>
        )}
      </div>
    </div>
  );
}
