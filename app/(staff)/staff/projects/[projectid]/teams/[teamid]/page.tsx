"use client";
import React, { useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, PlusCircle, Users, Workflow } from "lucide-react";
import {
  useAddBusinessTask,
  useGetBusinessTasks,
  useGetProjectsbyIdForStaffs,
  useGetTeamsForProjects,
} from "@/query/business/queries";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Avatar } from "antd";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TASK_STATUS } from "@/lib/constants";
import { toast } from "sonner";

const formatDateTiny = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClasses: Record<string, string> = {
  Completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  "In Progress": "border-amber-500/40 bg-amber-500/10 text-amber-200",
  "To Do": "border-sky-500/40 bg-sky-500/10 text-sky-200",
  Cancelled: "border-slate-500/40 bg-slate-500/20 text-slate-300",
};

const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
});

const TeamDetailsPage = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string; teamid: string }>();

  const { data: project, isLoading: loadingProject } = useGetProjectsbyIdForStaffs(params.projectid);
  const { data: teamsData, isLoading: loadingTeams } = useGetTeamsForProjects(params.projectid);
  const {
    data: tasksData,
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = useGetBusinessTasks(params.projectid);
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const [addTaskDialog, setAddTaskDialog] = useState(false);
  const businessId = project?.data?.business_id?.toString?.() ?? project?.data?.business_id;

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

  const taskSummary = useMemo(() => {
    const total = teamTasks.length;
    const completed = teamTasks.filter((task: any) => task?.status === "Completed").length;
    const active = teamTasks.filter(
      (task: any) => task?.status === "In Progress" || task?.status === "To Do"
    ).length;
    return { total, completed, active };
  }, [teamTasks]);

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

  const handleOpenStaffWorkflow = () => {
    router.push(`/staff/projects/${params.projectid}/task`);
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
    const newTask = {
      project_id: params.projectid,
      assigned_to: params.teamid,
      task_name: values.task_name,
      task_description: values.task_description,
      start_date: values.start_date,
      end_date: values.end_date,
      status: values.status.trim(),
      business_id: businessId,
      is_project_task: true,
    };

    const res: any = await addTask(newTask);
    if (res?.status === 201) {
      toast.success(res?.data?.message || "Task added successfully");
      setAddTaskDialog(false);
      refetchTasks();
    } else {
      toast.error(res?.data?.message || "Failed to add task");
    }
  };

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
              <BreadcrumbLink onClick={() => router.replace('/staff/projects')}>Manage Projects</BreadcrumbLink>
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
          <Button className="mt-3 text-xs" onClick={() => router.push(`/staff/projects/${params.projectid}/teams`)}>
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-scroll pb-20 min-h-screen space-y-5">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/staff/projects")}>
              Manage Projects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>
              {project?.data?.project_name || "Project"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => router.push(`/staff/projects/${params.projectid}/teams`)}
            >
              Teams
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{team?.team_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 p-5">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Team Overview
              </p>
              <h1 className="text-2xl font-semibold text-slate-100">{team?.team_name}</h1>
              <p className="text-xs text-slate-400">
                Department: {team?.project_dept_id?.department_name || "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="text-xs border-slate-700 text-slate-200"
                onClick={() => router.push(`/staff/projects/${params.projectid}/teams`)}
              >
                Manage Teams
                <ArrowUpRight size={14} className="ml-2" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Team Lead
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {team?.team_head?.name || "-"}
              </p>
              <p className="text-[11px] text-slate-500">{team?.team_head?.email || ""}</p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Members
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {teamMembers.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Active Tasks
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {taskSummary.active}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Completed
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {taskSummary.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/60">
          <TabsTrigger value="members" className="text-xs">
            Members
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <div className="grid gap-3 lg:grid-cols-[0.6fr_1.4fr]">
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
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Users size={14} /> Team Members
                </h2>
                <span className="text-[11px] text-slate-500">{teamMembers.length} total</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {teamMembers.length === 0 && (
                  <p className="text-xs text-slate-400">No members assigned yet.</p>
                )}
                {teamMembers.map((member: any) => (
                  <div
                    key={member?._id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-2"
                  >
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
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
            {loadingTasks && (
              <div className="flex items-center justify-center py-6">
                <LoaderSpin size={24} title="Loading tasks..." />
              </div>
            )}
            {!loadingTasks && teamTasks.length === 0 && (
              <p className="mt-3 text-xs text-slate-400">No tasks assigned to this team yet.</p>
            )}
            {!loadingTasks && teamTasks.length > 0 && (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {teamTasks.map((task: any) => (
                  <div
                    key={task?._id}
                    className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{task?.task_name}</h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {task?.task_description || "No description"}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full border ${
                          statusClasses[task?.status] ||
                          "border-slate-700 text-slate-300 bg-slate-900/40"
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
                        onClick={() => router.push(`/staff/tasks/${task?._id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addTaskDialog} onOpenChange={setAddTaskDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Team Task</DialogTitle>
            <DialogDescription>
              Create a project task and assign it directly to {team?.team_name || "this team"}.
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-3">
              <FormField
                control={taskForm.control}
                name="task_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
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
                    <FormLabel className="text-xs text-slate-300 font-semibold">
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
                      <FormLabel className="text-xs text-slate-300 font-semibold">
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
                      <FormLabel className="text-xs text-slate-300 font-semibold">
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
              <FormField
                control={taskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Status
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/50 text-slate-100 p-2 text-xs"
                      >
                        {TASK_STATUS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAddTaskDialog(false)}>
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
};

export default TeamDetailsPage;
