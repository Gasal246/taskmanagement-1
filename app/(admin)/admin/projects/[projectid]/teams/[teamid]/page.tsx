"use client";
import React, { useMemo } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Workflow } from 'lucide-react';
import { useGetBusinessTasks, useGetProjectById, useGetTeamsForProjects } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Avatar } from 'antd';

const formatDateTiny = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TeamDetailsPage = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string; teamid: string }>();

  const { data: project, isLoading: loadingProject } = useGetProjectById(params.projectid);
  const { data: teamsData, isLoading: loadingTeams } = useGetTeamsForProjects(params.projectid);
  const { data: tasksData, isLoading: loadingTasks } = useGetBusinessTasks(params.projectid);

  const team = useMemo(() => {
    return teamsData?.data?.find((item: any) => item?._id === params.teamid);
  }, [teamsData, params.teamid]);

  const teamMembers = useMemo(() => {
    const members = team?.members || [];
    return members
      .map((member: any) => member?.user_id)
      .filter(Boolean);
  }, [team]);

  const teamTasks = useMemo(() => {
    const tasks = tasksData?.data || [];
    return tasks.filter((task: any) => task?.assigned_teams?._id === params.teamid);
  }, [tasksData, params.teamid]);

  if (loadingProject || loadingTeams) {
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
        <LoaderSpin size={40} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen'>
        <Breadcrumb className='mb-3'>
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
              <BreadcrumbPage>Team</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">Team not found for this project.</p>
          <Button className="mt-3 text-xs" onClick={() => router.push(`/admin/projects/${params.projectid}/teams`)}>
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace('/admin/projects')}>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>{project?.data?.project_name || "Project"}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push(`/admin/projects/${params.projectid}/teams`)}>Teams</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{team?.team_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">{team?.team_name}</h1>
            <p className="text-xs text-slate-400">Department: {team?.project_dept_id?.department_name || "-"}</p>
          </div>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => router.push(`/admin/projects/${params.projectid}/teams`)}
          >
            Manage Teams
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
          <div>
            <p className="text-[11px] text-slate-500">Team Lead</p>
            <p className="text-slate-200">{team?.team_head?.name || "-"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Members</p>
            <p className="text-slate-200">{teamMembers.length}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/60">
          <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Users size={14} /> Team Lead
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar size={44} src={team?.team_head?.avatar_url} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{team?.team_head?.name || "-"}</p>
                  <p className="text-xs text-slate-500">{team?.team_head?.email || ""}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Users size={14} /> Team Members
              </h2>
              <div className="mt-3 space-y-2">
                {teamMembers.length === 0 && (
                  <p className="text-xs text-slate-400">No members assigned yet.</p>
                )}
                {teamMembers.map((member: any) => (
                  <div key={member?._id} className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-2">
                    <Avatar size={36} src={member?.avatar_url} />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{member?.name || "-"}</p>
                      <p className="text-[11px] text-slate-500">{member?.email || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Workflow size={14} /> Team Tasks
            </h2>
            {loadingTasks && (
              <div className="flex items-center justify-center py-6">
                <LoaderSpin size={24} title="Loading tasks..." />
              </div>
            )}
            {!loadingTasks && teamTasks.length === 0 && (
              <p className="mt-3 text-xs text-slate-400">No tasks assigned to this team yet.</p>
            )}
            {!loadingTasks && teamTasks.length > 0 && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {teamTasks.map((task: any) => (
                  <div key={task?._id} className="rounded-lg border border-slate-800/70 bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-200">{task?.task_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">
                        {task?.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">{task?.task_description || "No description"}</p>
                    <div className="mt-2 text-[11px] text-slate-500">
                      {formatDateTiny(task?.start_date)} - {formatDateTiny(task?.end_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamDetailsPage;
