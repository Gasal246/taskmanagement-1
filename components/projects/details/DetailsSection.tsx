"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "antd";
import {
  CheckCircle2,
  PanelsTopLeft,
  PencilRuler,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import MarkdownPreview from "@/components/shared/MarkdownPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useApproveProject,
  useDeleteProject,
} from "@/query/business/queries";
import { toast } from "sonner";

const EditProjectDialog = dynamic(() => import("./EditProjectDialog"), {
  ssr: false,
});

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export default function DetailsSection({
  project,
  mode,
  onChanged,
}: {
  project: any;
  mode: "admin" | "staff";
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { mutateAsync: approve, isPending: approving } = useApproveProject();
  const { mutateAsync: removeProject, isPending: removing } = useDeleteProject();
  const permissions = project?.permissions || {};
  const totalTasks = Number(project?.task_count || 0);
  const completedTasks = Number(project?.completed_task_count || 0);
  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const client = project?.client_id;

  const handleApprove = async () => {
    const response = await approve(project._id);
    if (response?.status === 200) {
      toast.success(response?.data?.message || "Project approved.");
      await onChanged();
    } else {
      toast.error("Unable to approve project.");
    }
  };

  const handleDelete = async () => {
    const response = await removeProject(project._id);
    if (response?.status === 200) {
      toast.success(response?.message || "Project deleted.");
      router.push("/admin/projects");
    } else {
      toast.error("Unable to delete project.");
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_18px_60px_-30px_rgba(34,211,238,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <PanelsTopLeft size={16} className="text-cyan-300" /> Project Details
          </h1>
          <div className="flex flex-wrap gap-2">
            {permissions.canApprove && !project?.is_approved && (
              <Button size="sm" onClick={handleApprove} disabled={approving}>
                <CheckCircle2 className="mr-2 size-4" />
                {approving ? "Approving..." : "Approve"}
              </Button>
            )}
            {permissions.canManage && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <PencilRuler className="mr-2 size-4" /> Edit Info
              </Button>
            )}
            {permissions.canDelete && mode === "admin" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="mr-2 size-4" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xl font-semibold text-white">
                {project?.project_name || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Overview
              </p>
              <MarkdownPreview
                content={project?.project_description}
                className="text-sm text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/55 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Progress
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {progress}%
                  </p>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold capitalize text-cyan-200">
                  {project?.status || "-"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Info label="Start Date" value={formatDate(project?.start_date)} />
                <Info label="End Date" value={formatDate(project?.end_date)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Client
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {client?.client_name || "No client associated"}
                </p>
                {client?.industry && (
                  <p className="text-xs text-slate-400">{client.industry}</p>
                )}
              </div>
              <Info label="Region" value={project?.region?.region_name || "-"} />
              <Info label="Area" value={project?.area?.area_name || "-"} />
              <Info label="Domain" value={project?.type || "-"} />
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Priority
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold capitalize text-slate-100">
                  <Square
                    size={8}
                    fill={project?.priority === "high" ? "#ef4444" : "#22d3ee"}
                  />
                  {project?.priority || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-900/40 bg-slate-950/55 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Users size={16} className="text-cyan-300" /> Project Heads
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Assignment changes are available from Operations.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(project?.project_heads || []).map((head: any) => (
            <div
              key={head._id}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3"
            >
              <Avatar src={head.avatar_url || "/avatar.png"} size={42} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {head.name}
                </p>
                <p className="truncate text-xs text-slate-400">{head.email}</p>
              </div>
            </div>
          ))}
          {(project?.project_heads || []).length === 0 && (
            <p className="text-xs text-slate-400">No project heads assigned.</p>
          )}
        </div>
      </div>

      {editing && (
        <EditProjectDialog
          open={editing}
          onOpenChange={setEditing}
          project={project}
          onSaved={onChanged}
        />
      )}

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This removes the project and its related records permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={removing}
            >
              {removing ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-100">
        {value}
      </p>
    </div>
  );
}
