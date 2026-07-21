"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  CheckCircle2,
  Edit,
  History,
  ListTodo,
  Navigation,
  PencilRuler,
  PlusCircle,
  Trash2,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  useAddTaskActivity,
  useDeleteBusinessTask,
  useDeleteTaskActivity,
  useGetAllStaffsForStaff,
  useGetTaskById,
  useUpdateBusinessTask,
  useUpdateTaskActivity,
} from "@/query/business/queries";
import { toast } from "sonner";
import { formatDateTimeShort, formatDateTiny } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEAD_ROLES, TASK_STATUS } from "@/lib/constants";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Button } from "@/components/ui/button";
import { Avatar } from "antd";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";
import ActivityCommentsSheet from "@/components/task/ActivityCommentsSheet";

const statusStyles: Record<string, string> = {
  Completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  "In Progress": "border-amber-500/40 bg-amber-500/15 text-amber-200",
  "To Do": "border-rose-500/40 bg-rose-500/15 text-rose-200",
  Cancelled: "border-slate-500/40 bg-slate-500/15 text-slate-200",
};

const getProgressValue = (completed: number, total: number) => {
  if (!total || total <= 0) return 0;
  const value = Math.round((completed / total) * 100);
  return Math.min(100, Math.max(0, value));
};

const getProgressClass = (value: number) => {
  if (value < 30) return "bg-red-500";
  if (value < 50) return "bg-yellow-500";
  if (value < 70) return "bg-blue-500";
  return "bg-emerald-500";
};

const resizeActivityTitle = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
};

const priorityStyles: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  normal: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

const activitySchema = z.object({
  activity_name: z.string().min(2, { message: "Activity name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  _id: z.string().optional(),
});

const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  priority: z.string().optional(),
  comments: z.string().optional(),
  status: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const resolveDomainId = (roleName: string, domainData: any) => {
  switch (roleName) {
    case "REGION_HEAD":
    case "REGION_STAFF":
      return domainData?.region_id;
    case "AREA_HEAD":
    case "AREA_STAFF":
      return domainData?.area_id;
    case "LOCATION_HEAD":
    case "LOCATION_STAFF":
      return domainData?.location_id;
    case "REGION_DEP_HEAD":
    case "REGION_DEP_STAFF":
    case "AREA_DEP_HEAD":
    case "AREA_DEP_STAFF":
    case "LOCATION_DEP_HEAD":
    case "LOCATION_DEP_STAFF":
      return domainData?.department_id;
    default:
      return domainData?.value;
  }
};

const normalizeStaff = (staff: any) => {
  const user = staff?.user_id || staff?.staff_id || staff;
  return {
    _id: user?._id,
    name: user?.name || staff?.name || "",
    email: user?.email || staff?.email || "",
    avatar_url: user?.avatar_url || staff?.avatar_url || null,
  };
};

const TaskDetails = () => {
  const router = useRouter();
  const params = useParams<{ taskid: string }>();
  const searchParams = useSearchParams();
  const { data: task, isLoading, refetch } = useGetTaskById(params.taskid, "assigned");
  const { mutateAsync: AddTaskActivity, isPending: isAddingActivity } = useAddTaskActivity();
  const { mutateAsync: UpdateTaskActivity, isPending: isUpdatingActivity } = useUpdateTaskActivity();
  const { mutateAsync: DeleteTaskActivity, isPending: isDeletingActivity } = useDeleteTaskActivity();
  const { mutateAsync: UpdateTask, isPending: isUpdatingTask } = useUpdateBusinessTask();
  const { mutateAsync: DeleteTask, isPending: isDeletingTask } = useDeleteBusinessTask();
  const { mutateAsync: getMyStaffs } = useGetAllStaffsForStaff();

  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [domainData, setDomainData] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);

  const [addActivityDialog, setAddActivityDialog] = useState(false);
  const [editActivityDialog, setEditActivityDialog] = useState(false);
  const [deleteActivityDialog, setDeleteActivityDialog] = useState(false);
  const [editTaskDialog, setEditTaskDialog] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [removeReassignmentOpen, setRemoveReassignmentOpen] = useState(false);
  const [reassignmentToRemove, setReassignmentToRemove] = useState<any>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyActivity, setHistoryActivity] = useState<any>(null);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatusActivity, setPendingStatusActivity] = useState<any>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState<boolean | null>(null);

  const taskData = task?.data;
  const isHead = HEAD_ROLES.includes(roleName);
  const visibleActivities = Array.isArray(taskData?.activities) ? taskData.activities : [];
  const visibleActivityCount = visibleActivities.length;
  const visibleCompletedActivityCount = visibleActivities.filter((activity: any) => activity?.is_done).length;
  const progress = getProgressValue(
    visibleCompletedActivityCount,
    visibleActivityCount
  );

  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_name: "",
      description: "",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      priority: "",
      comments: "",
      status: "To Do",
      start_date: "",
      end_date: "",
    },
  });

  useEffect(() => {
    const roleCookie = Cookies.get("user_role");
    const domainCookie = Cookies.get("user_domain");
    if (!roleCookie || !domainCookie) return;
    try {
      const roleJson = JSON.parse(roleCookie);
      const domainJson = JSON.parse(domainCookie);
      setRoleId(roleJson?._id || "");
      setRoleName(roleJson?.role_name || "");
      setDomainData(domainJson);
    } catch (error) {
      console.log("Invalid cookies for role/domain", error);
    }
  }, []);

  useEffect(() => {
    if (!taskData) return;
    taskForm.setValue("task_name", taskData.task_name);
    taskForm.setValue("task_description", taskData.task_description || "");
    taskForm.setValue("priority", taskData.priority || "");
    taskForm.setValue("comments", taskData.comments || "");
    taskForm.setValue("status", taskData.status);
    taskForm.setValue("start_date", taskData.start_date || "");
    taskForm.setValue("end_date", taskData.end_date || "");
  }, [taskData, taskForm]);

  useEffect(() => {
    if (!taskData) return;
    const fetchAuthority = async () => {
      const session: any = await getSession();
      setIsCreator(Boolean(taskData?.creator && session?.user?.id === taskData.creator));
    };
    fetchAuthority();
  }, [taskData]);

  const loadMyStaffs = useCallback(async () => {
    if (!roleId || !roleName || !domainData) return;
    const domainId = resolveDomainId(roleName, domainData);
    if (!domainId) return;
    setLoadingStaffs(true);
    const res = await getMyStaffs({ role_id: roleId, domain_id: domainId });
    if (res?.status === 200) {
      setStaffOptions((res?.data || []).map(normalizeStaff));
    } else {
      setStaffOptions([]);
    }
    setLoadingStaffs(false);
  }, [domainData, getMyStaffs, roleId, roleName]);

  const handleOpenAssignDialog = (activity: any) => {
    setActiveActivity(activity);
    setSelectedStaff(null);
    setStaffSearch("");
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedStaff(null);
    setStaffSearch("");
    setStaffOptions([]);
  };

  useEffect(() => {
    if (!assignDialogOpen) return;
    loadMyStaffs();
  }, [assignDialogOpen, loadMyStaffs]);

  const filteredStaffs = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return staffOptions;
    return staffOptions.filter((staff) => {
      const name = staff?.name || "";
      const email = staff?.email || "";
      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [staffOptions, staffSearch]);

  const historyEntries = useMemo(() => {
    if (!historyActivity?._id) return [];

    const entries = Array.isArray(historyActivity?.reassignment_history)
      ? historyActivity.reassignment_history
      : [];
    const timelineEntries: any[] = entries
      .filter((entry: any) => entry?.action === "reassigned")
      .map((entry: any) => ({
        ...entry,
        event_type: "reassigned",
        event_user: entry?.recipient_id,
        event_order: 2,
      }));

    if (historyActivity?.assigned_to?._id) {
      timelineEntries.push({
        _id: `assigned-${historyActivity._id}`,
        event_type: "assigned",
        event_user: historyActivity.assigned_to,
        event_order: 1,
        createdAt: historyActivity.createdAt,
      });
    }

    const createdBy = historyActivity?.created_by?._id
      ? historyActivity.created_by
      : taskData?.creator_details;
    if (createdBy?._id) {
      timelineEntries.push({
        _id: `created-${historyActivity._id}`,
        event_type: "created",
        event_user: createdBy,
        event_order: 0,
        createdAt: historyActivity.createdAt,
      });
    }

    return timelineEntries.sort((first: any, second: any) => {
      const timeDifference = new Date(second?.createdAt || 0).getTime() - new Date(first?.createdAt || 0).getTime();
      return timeDifference || Number(second?.event_order || 0) - Number(first?.event_order || 0);
    });
  }, [historyActivity, taskData?.creator_details]);

  const handleAssignActivity = async () => {
    if (!activeActivity?._id) return;
    if (!selectedStaff?._id) {
      toast.error("Please select a staff member.");
      return;
    }
    const res = await UpdateTaskActivity({
      activity_id: activeActivity._id,
      forwarded_to: selectedStaff._id,
      is_status: false,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Activity reassigned successfully.");
      handleCloseAssignDialog();
      refetch();
    } else {
      toast.error(res?.message || "Failed to reassign activity.");
    }
  };

  const handleOpenRemoveReassignment = (activity: any) => {
    if (!activity?.forwarded_to?._id) return;
    setReassignmentToRemove(activity);
    setRemoveReassignmentOpen(true);
  };

  const handleCloseRemoveReassignment = () => {
    setRemoveReassignmentOpen(false);
    setReassignmentToRemove(null);
  };

  const handleOpenHistory = (activity: any) => {
    setHistoryActivity(activity);
    setHistorySheetOpen(true);
  };

  const handleCloseHistory = () => {
    setHistorySheetOpen(false);
    setHistoryActivity(null);
  };

  const handleConfirmRemoveReassignment = async () => {
    if (!reassignmentToRemove?._id) return;
    const res = await UpdateTaskActivity({
      activity_id: reassignmentToRemove._id,
      forwarded_to: null,
      is_status: false,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Activity reassignment removed.");
      handleCloseRemoveReassignment();
      refetch();
    } else {
      toast.error(res?.message || "Failed to remove activity reassignment.");
    }
  };

  const onActivitySubmit = async (values: z.infer<typeof activitySchema>) => {
    if (addActivityDialog) {
      const newActivity = {
        task_id: params.taskid,
        activity: values.activity_name,
        description: values.description,
      };
      const res = await AddTaskActivity(newActivity);
      if (res?.status === 201) {
        toast.success(res?.data?.message || "Activity added");
      } else {
        toast.error(res?.data?.message || "Failed to add activity");
      }
    } else if (editActivityDialog) {
      const editData = {
        activity_id: editingActivity._id,
        activity: values.activity_name,
        description: values.description,
        is_status: false,
      };
      const res = await UpdateTaskActivity(editData);
      if (res?.status === 200) {
        toast.success(res?.message || "Activity updated");
      } else {
        toast.error(res?.message || "Failed to update activity");
      }
    }
    setAddActivityDialog(false);
    setEditActivityDialog(false);
    setEditingActivity(null);
    refetch();
  };

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
    const updateData = {
      task_id: params.taskid,
      task_name: values.task_name,
      task_description: values.task_description,
      priority: values.priority || undefined,
      comments: values.comments || undefined,
      status: values.status,
      is_project_task: taskData?.is_project_task,
      assigned_to: taskData?.assigned_to || null,
      assigned_teams: taskData?.assigned_teams || null,
      start_date: values.start_date || taskData?.start_date,
      end_date: values.end_date || taskData?.end_date,
    };
    const res = await UpdateTask(updateData);
    if (res?.status === 200) {
      toast.success(res?.data?.message || "Task updated successfully");
    } else {
      toast.error(res?.data?.message || "Failed to update task");
    }
    setEditTaskDialog(false);
    refetch();
  };

  const onDeleteActivityConfirm = async () => {
    if (selectedActivityId) {
      const res = await DeleteTaskActivity(selectedActivityId);
      if (res?.status === 203) {
        toast.success(res?.data?.message || "Activity deleted");
      } else {
        toast.error(res?.data?.message || "Failed to delete activity");
      }
    }
    setDeleteActivityDialog(false);
    setSelectedActivityId(null);
    refetch();
  };

  const onDeleteTaskConfirm = async () => {
    const res = await DeleteTask(params.taskid);
    if (res?.status === 200) {
      toast.success(res?.data?.message || "Task deleted successfully");
      router.push("/staff/tasks");
    } else {
      toast.error(res?.data?.message || "Failed to delete task");
    }
    setDeleteTaskDialog(false);
  };

  const handleOpenStatusConfirm = (activity: any, nextValue: boolean) => {
    setPendingStatusActivity(activity);
    setPendingStatusValue(nextValue);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusActivity?._id || pendingStatusValue === null) {
      setStatusConfirmOpen(false);
      return;
    }
    const data = {
      activity_id: pendingStatusActivity._id,
      is_done: pendingStatusValue,
      is_status: true,
    };
    const res = await UpdateTaskActivity(data);
    if (res?.status === 200) {
      toast.success(res?.message || "Activity status updated");
    } else {
      toast.error(res?.message || "Failed to update activity status");
    }
    setStatusConfirmOpen(false);
    setPendingStatusActivity(null);
    setPendingStatusValue(null);
    refetch();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const handleNavigateToProject = () => {
    if (taskData?.project_id) {
      router.push(`/staff/projects/${taskData.project_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center">
        <LoaderSpin size={40} />
      </div>
    );
  }

  if (!taskData) {
    return <div className="p-5 text-slate-300">Task not found</div>;
  }
  const priority = typeof taskData?.priority === "string" ? taskData.priority.toLowerCase() : "";

  return (
    <div className="p-5 overflow-y-scroll pb-20 min-h-screen space-y-4">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Go Back</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 to-slate-900/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-100">{taskData.task_name}</h1>
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border ${
                  statusStyles[taskData.status] ||
                  "border-slate-600/40 bg-slate-700/30 text-slate-200"
                }`}
              >
                {taskData.status}
              </span>
              {taskData.is_project_task && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 text-indigo-200">
                  Project Based
                </span>
              )}
              {priority && (
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border ${
                    priorityStyles[priority] ||
                    "border-slate-600/40 bg-slate-700/30 text-slate-200"
                  }`}
                >
                  {priority} Priority
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              {taskData.task_description || "No description added."}
            </p>
            {taskData?.comments && (
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/50 p-3 max-w-2xl">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Comments</p>
                <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">
                  {taskData.comments}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {taskData.is_project_task && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                onClick={handleNavigateToProject}
              >
                <Navigation size={12} />
                Go To Project
              </motion.button>
            )}
            {isCreator && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                  onClick={() => setEditTaskDialog(true)}
                >
                  <Edit size={12} />
                  Edit Task
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-2 px-4 rounded-lg border border-red-600/60 hover:border-red-400 bg-gradient-to-tr from-red-950/60 to-red-900/40 cursor-pointer text-xs font-medium flex gap-1 items-center"
                  onClick={() => setDeleteTaskDialog(true)}
                >
                  <Trash2 size={12} />
                  Delete Task
                </motion.button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Activities</p>
            <p className="text-base font-semibold text-slate-100 mt-1">
              {visibleActivityCount}
            </p>
            <p className="text-xs text-slate-400">Completed {visibleCompletedActivityCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Assigned</p>
            <p className="text-sm font-semibold text-slate-100 mt-1">
              {taskData.is_project_task
                ? taskData.assigned_team?.team_name || "Not assigned"
                : taskData.assigned_user?.name || "Not assigned"}
            </p>
            {taskData.is_project_task && (
              <p className="text-xs text-slate-400">
                {taskData.project_details?.project_name || "Project"}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Start Date</p>
            <p className="text-sm font-semibold text-slate-100 mt-1">
              {formatDateTiny(taskData.start_date) || "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">End Date</p>
            <p className="text-sm font-semibold text-slate-100 mt-1">
              {formatDateTiny(taskData.end_date) || "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-800/80">
            <div
              className={`h-2 rounded-full ${getProgressClass(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-200 w-12 text-right">{progress}%</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-sm text-slate-300 flex items-center gap-1">
            <ListTodo size={16} /> Activities
          </h2>
          {isCreator && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
              onClick={() => {
                activityForm.reset({ activity_name: "", description: "" });
                setAddActivityDialog(true);
              }}
            >
              <PlusCircle size={12} />
              Add Activity
            </motion.div>
          )}
        </div>

        <div className="flex flex-wrap">
          {visibleActivities.length > 0 ? (
            visibleActivities.map((activity: any) => (
              <div key={activity._id} className="w-full p-1">
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-200">{activity.activity}</p>
                      <p className="text-xs text-slate-400">
                        {activity.description || "No description."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {activity?.assigned_skill?.skill_name && (
                          <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                            Skill: {activity.assigned_skill.skill_name}
                          </span>
                        )}
                        {activity?.forwarded_to?._id && (
                          isHead ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRemoveReassignment(activity)}
                              className="flex items-center gap-2 rounded-md border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-left transition-colors hover:border-cyan-400 hover:bg-cyan-900/30"
                              title="Remove reassignment"
                            >
                              <Avatar src={activity.forwarded_to.avatar_url || "/avatar.png"} size={24} />
                              <span className="leading-tight">
                                <span className="block text-xs text-slate-200">{activity.forwarded_to.name || "Staff"}</span>
                                <span className="block text-[10px] text-slate-500">{activity.forwarded_to.email || ""}</span>
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-md border border-cyan-700/60 bg-cyan-950/30 px-2 py-1">
                              <Avatar src={activity.forwarded_to.avatar_url || "/avatar.png"} size={24} />
                              <span className="leading-tight">
                                <span className="block text-xs text-slate-200">{activity.forwarded_to.name || "Staff"}</span>
                                <span className="block text-[10px] text-slate-500">{activity.forwarded_to.email || ""}</span>
                              </span>
                            </div>
                          )
                        )}
                      </div>
                      {activity?.is_done && activity?.completed_in && (
                        <p className="text-xs text-slate-400 mt-2">
                          Completed In: <span className="font-semibold">{formatDuration(activity.completed_in)}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ActivityCommentsSheet
                        activity={activity}
                        taskId={params.taskid}
                        initiallyOpen={searchParams.get("comments") === "open" && searchParams.get("activityId") === String(activity._id)}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-2 px-3 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                        onClick={() => handleOpenHistory(activity)}
                      >
                        <History size={12} />
                        History
                      </motion.button>
                      {isHead && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenAssignDialog(activity)}
                        >
                          <UserPlus size={12} />
                          Reassign
                        </motion.button>
                      )}
                      {activity?.is_done ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-red-600/60 hover:border-red-400 bg-gradient-to-tr from-red-950/60 to-red-900/40 text-red-100 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenStatusConfirm(activity, false)}
                        >
                          <CheckCircle2 size={12} />
                          Mark Not Completed
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-emerald-600/60 hover:border-emerald-400 bg-gradient-to-tr from-emerald-950/60 to-emerald-900/40 text-emerald-100 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenStatusConfirm(activity, true)}
                        >
                          <CheckCircle size={12} />
                          Mark Completed
                        </motion.button>
                      )}
                      {isCreator && (
                        <>
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                            onClick={() => {
                              setEditingActivity(activity);
                              activityForm.setValue("activity_name", activity.activity);
                              activityForm.setValue("description", activity.description || "");
                              setEditActivityDialog(true);
                            }}
                          >
                            <PencilRuler size={14} />
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                            onClick={() => {
                              setSelectedActivityId(activity._id);
                              setDeleteActivityDialog(true);
                            }}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </motion.div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No activities</p>
          )}
        </div>
      </div>

      {/* Reassign Activity Dialog */}
      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => (open ? setAssignDialogOpen(true) : handleCloseAssignDialog())}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Reassign Activity</DialogTitle>
            <DialogDescription>
              Choose a staff member reporting to you for {activeActivity?.activity || "this activity"}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <Input
              placeholder="Search staff..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
            <div className="mt-3 max-h-[280px] overflow-y-auto space-y-2">
              {loadingStaffs && (
                <div className="w-full flex items-center justify-center h-[10vh]">
                  <LoaderSpin size={20} />
                </div>
              )}
              {!loadingStaffs && filteredStaffs.length === 0 && (
                <p className="text-xs text-slate-500">No matching staff found.</p>
              )}
              {filteredStaffs.map((staff: any) => (
                <button
                  key={staff._id}
                  type="button"
                  onClick={() => setSelectedStaff(staff)}
                  className={`w-full text-left p-2 rounded-lg border flex items-center gap-2 transition-colors ${
                    selectedStaff?._id === staff._id
                      ? "border-cyan-500/60 bg-cyan-500/10"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <Avatar src={staff?.avatar_url || "/avatar.png"} size={30} />
                  <div>
                    <p className="text-xs text-slate-200">{staff.name}</p>
                    <p className="text-[11px] text-slate-500">{staff.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={handleCloseAssignDialog}>
              Cancel
            </Button>
            <Button onClick={handleAssignActivity} disabled={isUpdatingActivity || !selectedStaff?._id}>
              {isUpdatingActivity ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment History Sheet */}
      <Sheet open={historySheetOpen} onOpenChange={(open) => (open ? setHistorySheetOpen(true) : handleCloseHistory())}>
        <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950 p-0 [&>button:first-child]:z-20 [&>button:first-child]:bg-slate-800/80 [&>button:first-child]:text-slate-300 sm:max-w-[620px]">
          <SheetHeader className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/30 px-6 py-5 pr-16 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <History className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="m-0 text-base text-slate-100">Reassignment History</SheetTitle>
                  <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {historyEntries.length} {historyEntries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <SheetDescription className="mt-1 truncate text-xs text-slate-400">
                  {historyActivity?.activity || "Activity"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {historyEntries.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 text-center">
                <History className="mb-3 size-8 text-slate-700" />
                <p className="text-sm font-medium text-slate-300">No reassignment history</p>
                <p className="mt-1 text-xs text-slate-500">Staff reassignments will appear here.</p>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute bottom-8 left-[11px] top-7 border-l-2 border-dashed border-cyan-700/50 sm:left-[13px]" aria-hidden="true" />
                {historyEntries.map((entry: any, index: number) => {
                  const user = entry?.event_user;
                  const eventType = entry?.event_type || "reassigned";
                  const eventLabel = eventType === "created"
                    ? "Created by"
                    : eventType === "assigned"
                      ? "Assigned to"
                      : "Reassigned to";
                  const markerClass = eventType === "created"
                    ? "bg-amber-400"
                    : eventType === "assigned"
                      ? "bg-cyan-500"
                      : "bg-emerald-400";
                  const date = entry?.createdAt ? new Date(entry.createdAt) : null;
                  const formattedDate = date && !Number.isNaN(date.getTime())
                    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "Date unavailable";
                  return (
                  <section key={entry?._id || `${entry?.createdAt}-${user?._id}-${index}`} className="relative pb-10 pl-9 last:pb-0 sm:pl-11">
                    <div className="flex items-center gap-3">
                      <span className="h-px min-w-4 flex-1 border-t border-dashed border-cyan-700/60" />
                      <p className="shrink-0 text-[11px] font-medium text-cyan-300 sm:text-xs">
                        {eventLabel} <span className="text-slate-400">{formattedDate}</span>
                      </p>
                      <span className="h-px min-w-4 flex-1 border-t border-dashed border-cyan-700/60" />
                    </div>

                    <span
                      className={`absolute left-[4px] top-[66px] size-4 rounded-full border-2 border-slate-950 shadow-[0_0_0_3px_rgba(15,23,42,1)] sm:left-[6px] ${markerClass}`}
                      aria-hidden="true"
                    />

                    <div className="mt-5 flex items-center gap-3 rounded-xl border border-cyan-800/60 bg-gradient-to-br from-cyan-950/60 via-slate-900/80 to-slate-950 p-3.5 shadow-sm shadow-black/20 transition-colors hover:border-cyan-700 sm:p-4">
                      <Avatar src={user?.avatar_url || "/avatar.png"} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {user?.name || "Unknown staff"}
                        </p>
                        <p className="truncate text-xs text-slate-400">{user?.email || "Email unavailable"}</p>
                      </div>
                      <time
                        className="hidden shrink-0 rounded-md border border-slate-700/70 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-500 sm:block"
                        title={formatDateTimeShort(String(entry?.createdAt || ""))}
                      >
                        {date && !Number.isNaN(date.getTime())
                          ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                          : ""}
                      </time>
                    </div>
                  </section>
                );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Reassignment Dialog */}
      <Dialog open={removeReassignmentOpen} onOpenChange={(open) => (open ? setRemoveReassignmentOpen(true) : handleCloseRemoveReassignment())}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Reassignment</DialogTitle>
            <DialogDescription>
              Do you want to remove this reassigned staff member from the activity?
            </DialogDescription>
          </DialogHeader>
          {reassignmentToRemove?.forwarded_to && (
            <div className="flex items-center gap-3 rounded-lg border border-cyan-700/60 bg-cyan-950/30 p-3">
              <Avatar src={reassignmentToRemove.forwarded_to.avatar_url || "/avatar.png"} size={34} />
              <div>
                <p className="text-sm text-slate-100">{reassignmentToRemove.forwarded_to.name || "Staff"}</p>
                <p className="text-xs text-slate-400">{reassignmentToRemove.forwarded_to.email || ""}</p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={handleCloseRemoveReassignment}>Cancel</Button>
            <Button
              className="border border-red-600/60 bg-gradient-to-tr from-red-950/60 to-red-900/40 text-red-100 hover:bg-red-900/60"
              onClick={handleConfirmRemoveReassignment}
              disabled={isUpdatingActivity}
            >
              {isUpdatingActivity ? "Removing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Activity Sheet */}
      <Sheet open={addActivityDialog} onOpenChange={setAddActivityDialog}>
        <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950 p-0 [&>button:first-child]:z-20 [&>button:first-child]:bg-slate-800/80 [&>button:first-child]:text-slate-300 sm:max-w-[520px]">
          <SheetHeader className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/30 px-6 py-5 pr-16 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <PlusCircle className="size-5" />
              </div>
              <div>
                <SheetTitle className="m-0 text-base text-slate-100">Add Activity</SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-400">
                  Add a new activity to this task.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-6 py-6">
                <FormField
                  control={activityForm.control}
                  name="activity_name"
                  render={({ field }) => (
                    <FormItem className="shrink-0">
                      <FormLabel className="sr-only">Activity title</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={1}
                          placeholder="Untitled"
                          {...field}
                          ref={(element) => {
                            field.ref(element);
                            resizeActivityTitle(element);
                          }}
                          className="max-h-40 min-h-10 resize-none overflow-x-hidden rounded-none border-0 bg-transparent px-0 py-1 text-2xl font-bold leading-tight text-slate-100 shadow-none placeholder:font-bold placeholder:text-slate-500 focus-visible:ring-0"
                          onChange={(event) => {
                            field.onChange(event);
                            resizeActivityTitle(event.currentTarget);
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => event.currentTarget.select()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={activityForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex min-h-0 flex-1 flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the activity description..."
                          className="min-h-0 flex-1 resize-none border-slate-700 bg-slate-900/40 p-4 leading-relaxed text-slate-200 focus-visible:border-cyan-600 focus-visible:ring-cyan-700/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/95 px-6 py-4">
                <Button type="button" variant="ghost" onClick={() => setAddActivityDialog(false)} disabled={isAddingActivity}>
                  Cancel
                </Button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg border border-cyan-700 bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
                  disabled={isAddingActivity}
                >
                  {isAddingActivity ? "Adding..." : "Add Activity"}
                </motion.button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Edit Activity Sheet */}
      <Sheet open={editActivityDialog} onOpenChange={setEditActivityDialog}>
        <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950 p-0 [&>button:first-child]:z-20 [&>button:first-child]:bg-slate-800/80 [&>button:first-child]:text-slate-300 sm:max-w-[520px]">
          <SheetHeader className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/30 px-6 py-5 pr-16 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <PencilRuler className="size-5" />
              </div>
              <div>
                <SheetTitle className="m-0 text-base text-slate-100">Edit Activity</SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-400">
                  Update the activity details.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-6 py-6">
                <FormField
                  control={activityForm.control}
                  name="activity_name"
                  render={({ field }) => (
                    <FormItem className="shrink-0">
                      <FormLabel className="sr-only">Activity title</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={1}
                          placeholder="Untitled"
                          {...field}
                          ref={(element) => {
                            field.ref(element);
                            resizeActivityTitle(element);
                          }}
                          className="max-h-40 min-h-10 resize-none overflow-x-hidden rounded-none border-0 bg-transparent px-0 py-1 text-2xl font-bold leading-tight text-slate-100 shadow-none placeholder:font-bold placeholder:text-slate-500 focus-visible:ring-0"
                          onChange={(event) => {
                            field.onChange(event);
                            resizeActivityTitle(event.currentTarget);
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => event.currentTarget.select()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={activityForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex min-h-0 flex-1 flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the activity description..."
                          className="min-h-0 flex-1 resize-none border-slate-700 bg-slate-900/40 p-4 leading-relaxed text-slate-200 focus-visible:border-cyan-600 focus-visible:ring-cyan-700/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-800 bg-slate-950/95 px-6 py-4">
                <Button type="button" variant="ghost" onClick={() => setEditActivityDialog(false)} disabled={isUpdatingActivity}>
                  Cancel
                </Button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg border border-cyan-700 bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
                  disabled={isUpdatingActivity}
                >
                  {isUpdatingActivity ? "Updating..." : "Update Activity"}
                </motion.button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialog} onOpenChange={setEditTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Edit the task details.</DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-3">
              <FormField
                control={taskForm.control}
                name="task_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Task Name</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Task name" {...field} />
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
                    <FormLabel className="text-xs text-slate-300 font-semibold">Description</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Task description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Priority</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="border-slate-600 focus:border-slate-400">
                          <SelectValue placeholder="No priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Comments</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Textarea
                        placeholder="Optional additional comments"
                        {...field}
                        className="min-h-[90px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-600 focus:border-slate-400">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Start Date</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
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
                    <FormLabel className="text-xs text-slate-300 font-semibold">End Date</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="w-full flex items-center justify-end">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold"
                  disabled={isUpdatingTask}
                >
                  {isUpdatingTask ? "Updating..." : "Update Task"}
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Activity Dialog */}
      <Dialog open={deleteActivityDialog} onOpenChange={setDeleteActivityDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex items-center justify-end gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-sm font-semibold"
              onClick={() => setDeleteActivityDialog(false)}
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="bg-red-600 p-2 px-4 rounded-lg border border-red-700 hover:border-red-400 text-sm font-semibold"
              onClick={onDeleteActivityConfirm}
              disabled={isDeletingActivity}
            >
              {isDeletingActivity ? "Deleting..." : "Delete"}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={deleteTaskDialog} onOpenChange={setDeleteTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              This will permanently delete the task and all its activities. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex items-center justify-end gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-sm font-semibold"
              onClick={() => setDeleteTaskDialog(false)}
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="bg-red-600 p-2 px-4 rounded-lg border border-red-700 hover:border-red-400 text-sm font-semibold"
              onClick={onDeleteTaskConfirm}
              disabled={isDeletingTask}
            >
              {isDeletingTask ? "Deleting..." : "Delete Task"}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Status Confirm Dialog */}
      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {pendingStatusValue ? "Mark Activity Completed" : "Mark Activity Not Completed"}
            </DialogTitle>
            <DialogDescription>
              {pendingStatusValue
                ? "Are you sure you want to mark this activity as completed?"
                : "Are you sure you want to mark this activity as not completed?"}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex items-center justify-end gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-sm font-semibold"
              onClick={() => setStatusConfirmOpen(false)}
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="bg-emerald-600 p-2 px-4 rounded-lg border border-emerald-700 hover:border-emerald-400 text-sm font-semibold"
              onClick={handleConfirmStatusChange}
              disabled={isUpdatingActivity}
            >
              {isUpdatingActivity ? "Updating..." : "Confirm"}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetails;
