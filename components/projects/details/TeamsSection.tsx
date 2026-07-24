"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "antd";
import { Button } from "@/components/ui/button";
import { ExternalLink, Users } from "lucide-react";
import { useProjectSection } from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

export default function TeamsSection({
  projectId,
  mode,
  canManage,
}: {
  projectId: string;
  mode: "admin" | "staff";
  canManage: boolean;
}) {
  const router = useRouter();
  const query = useProjectSection<any[]>(projectId, "teams");
  if (query.isPending) return <ProjectSectionSkeleton cards={4} />;
  if (query.isError) {
    return <ProjectSectionError onRetry={() => query.refetch()} />;
  }

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Users size={16} className="text-cyan-300" /> Project Teams
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Teams available under your project access.
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${mode}/projects/${projectId}/teams`)}
          >
            Manage Teams <ExternalLink className="ml-2 size-4" />
          </Button>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(query.data || []).map((team: any) => (
          <button
            type="button"
            key={team._id}
            onClick={() =>
              router.push(`/${mode}/projects/${projectId}/teams/${team._id}`)
            }
            className="rounded-xl border border-slate-700 bg-slate-900/55 p-4 text-left transition hover:border-cyan-700"
          >
            <p className="text-sm font-semibold text-slate-100">
              {team.team_name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {team.project_dept_id?.department_name || "No department"}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Avatar
                size={28}
                src={team.team_head?.avatar_url || "/avatar.png"}
              />
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-200">
                  {team.team_head?.name || "No team lead"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {team.members?.length || 0} members
                </p>
              </div>
            </div>
          </button>
        ))}
        {(query.data || []).length === 0 && (
          <p className="text-xs text-slate-400">
            No teams are available for this project.
          </p>
        )}
      </div>
    </div>
  );
}
