"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Activity, Clock3, Workflow } from 'lucide-react';
import { useGetFlowsByProject } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';

const formatDateTiny = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ProjectFlowView = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const { mutateAsync: GetFlowsByProject, isPending } = useGetFlowsByProject();
  const [flows, setFlows] = useState<any[]>([]);

  const fetchFlows = useCallback(async () => {
    const res = await GetFlowsByProject(params.projectid);
    setFlows(res?.data ?? []);
  }, [GetFlowsByProject, params.projectid]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const lastUpdated = flows?.[0]?.createdAt;
  const totalLogs = flows.length;
  const uniqueUsers = useMemo(() => {
    const users = new Set(flows.map((log: any) => log?.user_id).filter(Boolean));
    return users.size;
  }, [flows]);

  if (isPending) {
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
        <LoaderSpin size={40} />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-4'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace('/admin/projects')}>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Project</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Flows</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">Project Flow</p>
            <h1 className="mt-2 text-lg font-semibold text-slate-100">A clean record of every milestone and change.</h1>
            <p className="mt-1 text-xs text-slate-400">Keep everyone aligned with clear, time-stamped activity logs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <div className="rounded-full border border-slate-700 px-3 py-1 flex items-center gap-2">
              <Activity size={14} className="text-cyan-300" />
              {totalLogs} logs
            </div>
            <div className="rounded-full border border-slate-700 px-3 py-1 flex items-center gap-2">
              <Clock3 size={14} className="text-emerald-300" />
              {lastUpdated ? formatDateTiny(lastUpdated) : "No activity"}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Total logs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalLogs}</p>
            <p className="mt-1 text-[11px] text-slate-400">Recorded project events</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Active contributors</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{uniqueUsers}</p>
            <p className="mt-1 text-[11px] text-slate-400">People who logged actions</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Latest update</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{lastUpdated ? formatDateTiny(lastUpdated) : "No updates yet"}</p>
            <p className="mt-1 text-[11px] text-slate-400">Most recent activity</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Workflow size={16} className="text-cyan-300" />
            Activity Timeline
          </h2>
          <span className="text-xs text-slate-500">Latest first</span>
        </div>

        <div className="space-y-4">
          {flows?.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No activity logs recorded yet.
            </div>
          )}

          {flows?.map((log: any, index: number) => (
            <div key={log._id} className="relative pl-6">
              <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-cyan-400" />
              {index < flows.length - 1 && (
                <span className="absolute left-[10px] top-5 h-full w-px bg-slate-800" />
              )}
              <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-slate-100">{log.Log}</h3>
                {log.description && (
                  <p className="mt-2 text-xs text-slate-400">{log.description}</p>
                )}
                <div className="mt-3 text-[11px] text-slate-500">{formatDateTiny(log.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectFlowView;
