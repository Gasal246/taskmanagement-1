"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "antd";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Edit,
  PlusCircle,
  Search,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAddBusinessTask,
  useGetBusinessTasks,
  useGetStaffsByDepartment,
  useGetTeamsForProjects,
  useRemoveProjectTeams,
  useUpdateTeam,
} from "@/query/business/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { projectSectionKey, useProjectDetails } from "./project-details-api";
import { useQueryClient } from "@tanstack/react-query";

type ProjectMode = "admin" | "staff";

type TeamMemberRow = {
  _id?: string;
  user_id?:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
        avatar_url?: string;
      };
};

type ProjectTeam = {
  _id: string;
  team_name?: string;
  department_id?: string | { toString?: () => string };
  project_dept_id?: {
    _id?: string;
    department_name?: string;
  };
  team_head?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  members?: TeamMemberRow[];
};

const taskSchema = z.object({
  task_name: z
    .string()
    .min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
});

const statusClasses: Record<string, string> = {
  Completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  "In Progress": "border-amber-500/40 bg-amber-500/10 text-amber-200",
  "To Do": "border-sky-500/40 bg-sky-500/10 text-sky-200",
  Cancelled: "border-slate-500/40 bg-slate-500/20 text-slate-300",
};

const formatDateTiny = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const memberId = (member: TeamMemberRow) =>
  typeof member.user_id === "string" ? member.user_id : member.user_id?._id || "";

const memberUser = (member: TeamMemberRow) =>
  typeof member.user_id === "string" ? null : member.user_id;

export default function TeamDetailsPage({
  projectId,
  teamId,
  mode,
}: {
  projectId: string;
  teamId: string;
  mode: ProjectMode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const parentTeamsUrl = `/${mode}/projects/${projectId}?section=teams`;

  const projectQuery = useProjectDetails(projectId, mode);
  const teamsQuery = useGetTeamsForProjects(projectId);
  const tasksQuery = useGetBusinessTasks(projectId);
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const { mutateAsync: updateTeam, isPending: updatingTeam } = useUpdateTeam();
  const { mutateAsync: removeTeam, isPending: removingTeam } =
    useRemoveProjectTeams();
  const { mutateAsync: getStaffByDepartment, isPending: loadingStaff } =
    useGetStaffsByDepartment();

  const [addTaskDialog, setAddTaskDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "tasks">("tasks");
  const [departmentStaffs, setDepartmentStaffs] = useState<any[]>([]);
  const [searchQueryLead, setSearchQueryLead] = useState("");
  const [searchQueryMembers, setSearchQueryMembers] = useState("");
  const [editForm, setEditForm] = useState({
    team_name: "",
    team_lead_id: "",
    team_member_ids: [] as string[],
  });

  const project = projectQuery.data;
  const canManage = Boolean(project?.permissions?.canManage);
  const businessId =
    project?.business_id?.toString?.() ?? project?.business_id ?? "";
  const team = useMemo(
    () =>
      ((teamsQuery.data?.data ?? []) as ProjectTeam[]).find(
        (item) => item._id === teamId
      ),
    [teamId, teamsQuery.data]
  );

  const teamMembers = useMemo(
    () => (team?.members ?? []).map(memberUser).filter(Boolean) as NonNullable<ReturnType<typeof memberUser>>[],
    [team]
  );
  const teamTasks = useMemo(
    () =>
      (tasksQuery.data?.data ?? []).filter(
        (task: any) =>
          (Array.isArray(task?.assigned_teams)
            ? task.assigned_teams
            : task?.assigned_teams
              ? [task.assigned_teams]
              : []
          ).some((team: any) => (team?._id || team)?.toString() === teamId)
      ),
    [teamId, tasksQuery.data]
  );
  const taskSummary = useMemo(
    () => ({
      active: teamTasks.filter(
        (task: any) => task?.status === "In Progress" || task?.status === "To Do"
      ).length,
      completed: teamTasks.filter((task: any) => task?.status === "Completed")
        .length,
    }),
    [teamTasks]
  );

  const filteredStaffsForLead = useMemo(
    () =>
      departmentStaffs.filter((staff) =>
        staff?.user_id?.name
          ?.toLowerCase()
          .includes(searchQueryLead.toLowerCase())
      ),
    [departmentStaffs, searchQueryLead]
  );
  const filteredStaffsForMembers = useMemo(
    () =>
      departmentStaffs.filter(
        (staff) =>
          staff?.user_id?._id !== editForm.team_lead_id &&
          staff?.user_id?.name
            ?.toLowerCase()
            .includes(searchQueryMembers.toLowerCase())
      ),
    [departmentStaffs, editForm.team_lead_id, searchQueryMembers]
  );

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      start_date: "",
      end_date: "",
      status: "To Do",
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadDepartmentStaff = async () => {
      if (!editTeamDialog || !team?.department_id) return;
      const departmentId =
        team.department_id?.toString?.() ?? String(team.department_id);
      const response = await getStaffByDepartment(departmentId);
      if (!cancelled) {
        setDepartmentStaffs(response?.status === 200 ? response.data ?? [] : []);
      }
    };

    void loadDepartmentStaff();
    return () => {
      cancelled = true;
    };
  }, [editTeamDialog, getStaffByDepartment, team?.department_id]);

  const openEditTeam = () => {
    if (!team) return;
    setEditForm({
      team_name: team.team_name || "",
      team_lead_id: team.team_head?._id || "",
      team_member_ids: (team.members ?? []).map(memberId).filter(Boolean),
    });
    setSearchQueryLead("");
    setSearchQueryMembers("");
    setEditTeamDialog(true);
  };

  const closeEditTeam = () => {
    setEditTeamDialog(false);
    setDepartmentStaffs([]);
    setSearchQueryLead("");
    setSearchQueryMembers("");
  };

  const handleUpdateTeam = async () => {
    if (!team || !editForm.team_name.trim() || !editForm.team_lead_id) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await updateTeam({
        _id: team._id,
        team_name: editForm.team_name.trim(),
        team_head: editForm.team_lead_id,
        team_members: editForm.team_member_ids,
      });
      if (response?.status !== 200) {
        toast.error(response?.message || "Failed to update team");
        return;
      }

      toast.success(response.message || "Team updated");
      await teamsQuery.refetch();
      await queryClient.invalidateQueries({
        queryKey: projectSectionKey(projectId, "document-viewers"),
      });
      closeEditTeam();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to update team"
      );
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    try {
      const response = await removeTeam(team._id);
      if (response?.status !== 200) {
        toast.error(response?.message || "Failed to delete team");
        return;
      }

      toast.success(response.message || "Team deleted successfully");
      await queryClient.invalidateQueries({
        queryKey: ["teams_for_project", projectId],
      });
      router.replace(parentTeamsUrl);
    } catch (error: any) {
      toast.error(
        error?.message || error?.response?.data?.message || "Failed to delete team"
      );
    }
  };

  const handleAddTask = () => {
    taskForm.reset({
      task_name: "",
      task_description: "",
      start_date: "",
      end_date: "",
      status: "To Do",
    });
    setAddTaskDialog(true);
  };

  const handleCreateTask = async (values: z.infer<typeof taskSchema>) => {
    if (!businessId) {
      toast.error("Business details not available yet.");
      return;
    }

    try {
      const response = await addTask({
        project_id: projectId,
        assigned_to: [teamId],
        task_name: values.task_name,
        task_description: values.task_description,
        start_date: values.start_date,
        end_date: values.end_date,
        status: values.status.trim(),
        business_id: businessId,
        is_project_task: true,
      });

      if (response?.status !== 201) {
        toast.error(response?.data?.message || "Failed to add task");
        return;
      }

      toast.success(response.data?.message || "Task added successfully");
      setAddTaskDialog(false);
      await tasksQuery.refetch();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to add task"
      );
    }
  };

  if (projectQuery.isPending || teamsQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-y-scroll p-5 pb-20">
        <LoaderSpin size={40} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen overflow-y-scroll p-5 pb-20">
        <ProjectBreadcrumb
          mode={mode}
          projectName={project?.project_name || "Project"}
          teamName="Team"
          teamsUrl={parentTeamsUrl}
        />
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-400">
            Team not found for this project or is outside your access.
          </p>
          <Button
            className="mt-3 text-xs"
            onClick={() => router.push(parentTeamsUrl)}
          >
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 overflow-y-scroll p-4 pb-20 sm:p-5">
      <ProjectBreadcrumb
        mode={mode}
        projectName={project?.project_name || "Project"}
        teamName={team.team_name || "Team"}
        teamsUrl={parentTeamsUrl}
      />

      <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 p-5">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Team Overview
              </p>
              <h1 className="text-2xl font-semibold text-slate-100">
                {team.team_name}
              </h1>
              <p className="text-xs text-slate-400">
                Department: {team.project_dept_id?.department_name || "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-slate-700 text-xs text-slate-200"
                onClick={() => router.push(parentTeamsUrl)}
              >
                <ArrowLeft size={14} className="mr-2" />
                Back to Teams
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  className="border-emerald-700/60 text-xs text-emerald-300 hover:bg-emerald-950/40"
                  onClick={openEditTeam}
                >
                  <Edit size={14} className="mr-2" />
                  Edit Team
                </Button>
              )}
              {canManage && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-800/70 text-xs text-red-300 hover:bg-red-950/40 hover:text-red-200"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-slate-800 bg-slate-950">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {team.team_name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the team and its memberships. Teams
                        with assigned project tasks cannot be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={removingTeam}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={removingTeam}
                        onClick={(event) => {
                          event.preventDefault();
                          void handleDeleteTeam();
                        }}
                        className="bg-red-600 text-white hover:bg-red-500"
                      >
                        {removingTeam ? "Deleting..." : "Delete Team"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <OverviewCard
              label="Team Lead"
              value={team.team_head?.name || "-"}
              caption={team.team_head?.email || ""}
            />
            <OverviewCard label="Members" value={String(teamMembers.length)} />
            <OverviewCard label="Active Tasks" value={String(taskSummary.active)} />
            <OverviewCard label="Completed" value={String(taskSummary.completed)} />
          </div>
        </div>
      </div>

      <div className="w-full">
        <div
          role="tablist"
          aria-label="Team details"
          className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "members"
                ? "border-cyan-500/70 bg-gradient-to-tr from-cyan-950 via-slate-900 to-slate-800 text-cyan-100 shadow-[0_0_22px_-12px_rgba(34,211,238,0.9)]"
                : "border-slate-800 bg-gradient-to-tr from-slate-950 to-slate-900 text-slate-400 hover:border-cyan-900 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            Members
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "tasks"
                ? "border-emerald-500/70 bg-gradient-to-tr from-emerald-950 via-slate-900 to-slate-800 text-emerald-100 shadow-[0_0_22px_-12px_rgba(52,211,153,0.9)]"
                : "border-slate-800 bg-gradient-to-tr from-slate-950 to-slate-900 text-slate-400 hover:border-emerald-900 hover:text-slate-200"
            }`}
          >
            <Workflow size={14} />
            Tasks
          </button>
        </div>

        {activeTab === "members" && (
          <div role="tabpanel" className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Users size={14} /> Team Lead
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar
                  size={44}
                  src={team.team_head?.avatar_url || "/avatar.png"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {team.team_head?.name || "-"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {team.team_head?.email || ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Users size={14} /> Team Members
                </h2>
                <span className="text-[11px] text-slate-500">
                  {teamMembers.length} total
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {teamMembers.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No members assigned yet.
                  </p>
                )}
                {teamMembers.map((member) => (
                  <div
                    key={member?._id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-2"
                  >
                    <Avatar
                      size={36}
                      src={member?.avatar_url || "/avatar.png"}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {member?.name || "-"}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {member?.email || ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div
            role="tabpanel"
            className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Workflow size={14} /> Team Tasks
              </h2>
              <Button
                size="sm"
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                onClick={handleAddTask}
              >
                <PlusCircle size={14} className="mr-1" />
                Add Task
              </Button>
            </div>
            {tasksQuery.isLoading && (
              <div className="flex items-center justify-center py-6">
                <LoaderSpin size={24} title="Loading tasks..." />
              </div>
            )}
            {!tasksQuery.isLoading && teamTasks.length === 0 && (
              <p className="mt-3 text-xs text-slate-400">
                No tasks assigned to this team yet.
              </p>
            )}
            {!tasksQuery.isLoading && teamTasks.length > 0 && (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {teamTasks.map((task: any) => (
                  <div
                    key={task?._id}
                    className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">
                          {task?.task_name}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {task?.task_description || "No description"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${
                          statusClasses[task?.status] ||
                          "border-slate-700 bg-slate-900/40 text-slate-300"
                        }`}
                      >
                        {task?.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {formatDateTiny(task?.start_date)} - {formatDateTiny(task?.end_date)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-slate-300"
                        onClick={() => router.push(`/${mode}/tasks/${task?._id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <EditTeamDialog
        open={editTeamDialog && canManage}
        onOpenChange={(open) => !open && closeEditTeam()}
        team={team}
        form={editForm}
        setForm={setEditForm}
        leadSearch={searchQueryLead}
        setLeadSearch={setSearchQueryLead}
        memberSearch={searchQueryMembers}
        setMemberSearch={setSearchQueryMembers}
        leads={filteredStaffsForLead}
        members={filteredStaffsForMembers}
        loadingStaff={loadingStaff}
        updating={updatingTeam}
        onSubmit={handleUpdateTeam}
      />

      <Dialog open={addTaskDialog} onOpenChange={setAddTaskDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Team Task</DialogTitle>
            <DialogDescription>
              Create a project task and assign it directly to {team.team_name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form
              onSubmit={taskForm.handleSubmit(handleCreateTask)}
              className="space-y-3"
            >
              <FormField
                control={taskForm.control}
                name="task_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Task Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Define the task scope" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="task_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Task Description
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add helpful context or goals" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={taskForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Start Date
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        End Date
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="rounded-md border border-cyan-900/50 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-100">
                New project tasks start in To Do.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddTaskDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  disabled={addingTask}
                >
                  {addingTask ? "Saving..." : "Add Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectBreadcrumb({
  mode,
  projectName,
  teamName,
  teamsUrl,
}: {
  mode: ProjectMode;
  projectName: string;
  teamName: string;
  teamsUrl: string;
}) {
  const router = useRouter();
  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer"
            onClick={() => router.push(`/${mode}/projects`)}
          >
            Manage Projects
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer"
            onClick={() => router.push(teamsUrl)}
          >
            {projectName}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer"
            onClick={() => router.push(teamsUrl)}
          >
            Teams
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{teamName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function OverviewCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
      {caption && <p className="text-[11px] text-slate-500">{caption}</p>}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-slate-700 pl-8 text-sm focus:border-cyan-500 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
    </div>
  );
}

function EditTeamDialog({
  open,
  onOpenChange,
  team,
  form,
  setForm,
  leadSearch,
  setLeadSearch,
  memberSearch,
  setMemberSearch,
  leads,
  members,
  loadingStaff,
  updating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: ProjectTeam;
  form: {
    team_name: string;
    team_lead_id: string;
    team_member_ids: string[];
  };
  setForm: Dispatch<
    SetStateAction<{
      team_name: string;
      team_lead_id: string;
      team_member_ids: string[];
    }>
  >;
  leadSearch: string;
  setLeadSearch: (value: string) => void;
  memberSearch: string;
  setMemberSearch: (value: string) => void;
  leads: any[];
  members: any[];
  loadingStaff: boolean;
  updating: boolean;
  onSubmit: () => void;
}) {
  const selectLead = (userId: string) => {
    setForm((current) => ({
      ...current,
      team_lead_id: userId,
      team_member_ids: current.team_member_ids.filter((id) => id !== userId),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team name, lead, and assigned members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] text-slate-400">Team name</p>
            <Input
              value={form.team_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  team_name: event.target.value,
                }))
              }
              placeholder="Team Name"
            />
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[11px] text-slate-500">Department</p>
            <p className="mt-1 text-sm text-slate-200">
              {team.project_dept_id?.department_name || "-"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">Select team lead</p>
            <SearchField
              value={leadSearch}
              onChange={setLeadSearch}
              placeholder="Search team lead..."
            />
            <Select
              value={form.team_lead_id}
              onValueChange={selectLead}
              disabled={loadingStaff}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingStaff ? "Loading staff..." : "Select Team Lead"}
                />
              </SelectTrigger>
              <SelectContent>
                {leads.length === 0 && (
                  <SelectItem value="no-leads" disabled>
                    No staff found
                  </SelectItem>
                )}
                {leads.map((staff) => (
                  <SelectItem key={staff._id} value={staff.user_id?._id}>
                    {staff.user_id?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.team_lead_id && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">Team members</p>
              <SearchField
                value={memberSearch}
                onChange={setMemberSearch}
                placeholder="Search team members..."
              />
              <div className="max-h-[180px] space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/40 p-2">
                {members.length === 0 && (
                  <p className="text-xs text-slate-500">No members found.</p>
                )}
                {members.map((staff) => {
                  const userId = staff.user_id?._id;
                  return (
                    <label
                      key={staff._id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={form.team_member_ids.includes(userId)}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            team_member_ids: checked
                              ? [...current.team_member_ids, userId]
                              : current.team_member_ids.filter(
                                  (id) => id !== userId
                                ),
                          }))
                        }
                      />
                      <span className="text-sm text-slate-200">
                        {staff.user_id?.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <Button className="w-full" onClick={onSubmit} disabled={updating}>
            {updating ? "Updating..." : "Update Team"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
