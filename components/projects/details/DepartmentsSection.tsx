"use client";

import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectSection } from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

export default function DepartmentsSection({
  projectId,
  mode,
  canManage,
}: {
  projectId: string;
  mode: "admin" | "staff";
  canManage: boolean;
}) {
  const router = useRouter();
  const query = useProjectSection<any[]>(projectId, "departments");
  if (query.isPending) return <ProjectSectionSkeleton cards={4} />;
  if (query.isError) {
    return <ProjectSectionError onRetry={() => query.refetch()} />;
  }

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Building2 size={16} className="text-cyan-300" /> Project Departments
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Departments linked to this project.
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${mode}/projects/${projectId}/depts`)}
          >
            Manage Departments <ExternalLink className="ml-2 size-4" />
          </Button>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(query.data || []).map((department: any) => (
          <div
            key={department._id}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/55 p-4"
          >
            <p className="text-sm font-semibold text-slate-100">
              {department.department_name}
            </p>
            {department.is_active && (
              <CheckCircle2 size={17} className="text-emerald-300" />
            )}
          </div>
        ))}
        {(query.data || []).length === 0 && (
          <p className="text-xs text-slate-400">
            No departments are linked to this project.
          </p>
        )}
      </div>
    </div>
  );
}
