"use client";

import ActivityHistorySheet from "@/components/task/ActivityHistorySheet";
import ChangeActivityDeadlineDialog from "@/components/task/ChangeActivityDeadlineDialog";

import ActivityScheduleFields from "@/components/task/ActivityScheduleFields";
import { activityScheduleFields, isScheduleOrdered, scheduleOrderError, toLocalDateTimeInput, formatScheduleDate } from "@/lib/activity-schedule";

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
  Building2,
  Check,
  CheckCircle,
  CheckCircle2,
  Edit,
  History,
  ListTodo,
  Navigation,
  PencilRuler,
  PlusCircle,
  RefreshCw,
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
  useGetHierarchyHeadsForReassignment,
  useGetTaskById,
  useUpdateBusinessTask,
  useUpdateTaskActivity,
} from "@/query/business/queries";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEAD_ROLES } from "@/lib/constants";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Button } from "@/components/ui/button";
import { Avatar } from "antd";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";
import ActivityCommentsSheet from "@/components/task/ActivityCommentsSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import ProjectTaskHeaderSummary from "@/components/tasks/ProjectTaskHeaderSummary";

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

const activityContentSchema = z.object({
  activity_name: z.string().min(2, { message: "Activity name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  _id: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
});
const activitySchema = activityContentSchema.extend(activityScheduleFields).refine(isScheduleOrdered, scheduleOrderError);

const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  priority: z.string().optional(),
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
    _id: user?._id || user?.id,
    name: user?.name || staff?.name || "",
    email: user?.email || staff?.email || "",
    avatar_url: user?.avatar_url || staff?.avatar_url || null,
  };
};

const TaskDetails = () => {
  const router = useRouter();
  const params = useParams<{ taskid: string }>();
  const searchParams = useSearchParams();
  const { data: task, isLoading, isError, error, isFetching, refetch } = useGetTaskById(params.taskid, "assigned");
  const { mutateAsync: AddTaskActivity, isPending: isAddingActivity } = useAddTaskActivity();
  const { mutateAsync: UpdateTaskActivity, isPending: isUpdatingActivity } = useUpdateTaskActivity();
  const { mutateAsync: DeleteTaskActivity, isPending: isDeletingActivity } = useDeleteTaskActivity();
  const { mutateAsync: UpdateTask, isPending: isUpdatingTask } = useUpdateBusinessTask();
  const { mutateAsync: DeleteTask, isPending: isDeletingTask } = useDeleteBusinessTask();
  const { mutateAsync: getMyStaffs } = useGetAllStaffsForStaff();
  const {
    mutateAsync: getHierarchyHeads,
    isPending: loadingHierarchyHeads,
  } = useGetHierarchyHeadsForReassignment();

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
  const [assignTab, setAssignTab] = useState<"staffs" | "departments">("staffs");
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [hierarchyHeadOptions, setHierarchyHeadOptions] = useState<any[]>([]);
  const [hierarchyHeadsLoaded, setHierarchyHeadsLoaded] = useState(false);
  const [hierarchyHeadsError, setHierarchyHeadsError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [removeReassignmentOpen, setRemoveReassignmentOpen] = useState(false);
  const [reassignmentToRemove, setReassignmentToRemove] = useState<any>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historyActivityId, setHistoryActivityId] = useState<string | null>(null);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatusActivity, setPendingStatusActivity] = useState<any>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState<boolean | null>(null);

  const taskData = task?.data;
  const historyActivity = taskData?.activities?.find((activity: any) => String(activity._id) === historyActivityId) || null;
  const isHead = HEAD_ROLES.includes(roleName);
  const canManageActivities = Boolean(taskData?.permissions?.canManageActivities);
  const canAssignActivities = Boolean(taskData?.permissions?.canAssignActivities);
  const canAddActivity = taskData?.is_project_task ? canManageActivities && isCreator : isCreator || (isHead && canManageActivities);
  const visibleActivities = Array.isArray(taskData?.activities) ? taskData.activities : [];
  const visibleActivityCount = visibleActivities.length;
  const visibleCompletedActivityCount = visibleActivities.filter((activity: any) => activity?.is_done).length;
  const progress = getProgressValue(
    visibleCompletedActivityCount,
    visibleActivityCount
  );

  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: (values, context, options) => {
      const unchanged = editActivityDialog && editingActivity &&
        values.start_date === toLocalDateTimeInput(editingActivity.start_date) &&
        values.end_date === toLocalDateTimeInput(editingActivity.end_date);
      return zodResolver(unchanged ? activityContentSchema : activitySchema)(values, context, options);
    },
    defaultValues: {
      activity_name: "",
      description: "",
      start_date: "",
      end_date: "",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      priority: "",
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
    if (taskData?.is_project_task) {
      setLoadingStaffs(true);
      try {
        const response = await axios.get(`/api/task/${params.taskid}/assignment-candidates`);
        setStaffOptions((response.data?.data || []).map(normalizeStaff));
      } catch {
        setStaffOptions([]);
      } finally {
        setLoadingStaffs(false);
      }
      return;
    }
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
  }, [domainData, getMyStaffs, params.taskid, roleId, roleName, taskData?.is_project_task]);

  const handleOpenAssignDialog = (activity: any) => {
    setActiveActivity(activity);
    setAssignTab("staffs");
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

  const loadHierarchyHeads = useCallback(async () => {
    if (hierarchyHeadsLoaded || loadingHierarchyHeads) return;
    setHierarchyHeadsError("");
    const res = await getHierarchyHeads();
    if (res?.status === 200) {
      setHierarchyHeadOptions(Array.isArray(res?.data) ? res.data : []);
      setHierarchyHeadsLoaded(true);
      return;
    }
    setHierarchyHeadsError(res?.message || "Failed to load other department heads.");
  }, [getHierarchyHeads, hierarchyHeadsLoaded, loadingHierarchyHeads]);

  const handleAssignTabChange = (value: string) => {
    if (taskData?.is_project_task) return;
    const nextTab = value === "departments" ? "departments" : "staffs";
    setAssignTab(nextTab);
    setSelectedStaff(null);
    setStaffSearch("");
    if (nextTab === "departments" && !hierarchyHeadsLoaded) {
      loadHierarchyHeads();
    }
  };

  useEffect(() => {
    if (!assignDialogOpen) return;
    loadMyStaffs();
  }, [assignDialogOpen, loadMyStaffs]);

  useEffect(() => {
    if (!addActivityDialog) return;
    const frame = window.requestAnimationFrame(() => activityForm.setFocus("activity_name"));
    return () => window.cancelAnimationFrame(frame);
  }, [activityForm, addActivityDialog]);

  const filteredStaffs = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return staffOptions;
    return staffOptions.filter((staff) => {
      const name = staff?.name || "";
      const email = staff?.email || "";
      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [staffOptions, staffSearch]);

  const filteredHierarchyHeads = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return hierarchyHeadOptions;
    return hierarchyHeadOptions.filter((head) => {
      const domainNames = Array.isArray(head?.domains)
        ? head.domains.map((domain: any) => domain?.name || "").join(" ")
        : "";
      return `${head?.name || ""} ${head?.email || ""} ${domainNames}`
        .toLowerCase()
        .includes(term);
    });
  }, [hierarchyHeadOptions, staffSearch]);



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
    setHistoryActivityId(String(activity._id));
    setHistorySheetOpen(true);
  };

  const handleCloseHistory = () => {
    setHistorySheetOpen(false);
    setHistoryActivityId(null);
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
    const scheduleChanged = !editActivityDialog ||
      values.start_date !== toLocalDateTimeInput(editingActivity?.start_date) ||
      values.end_date !== toLocalDateTimeInput(editingActivity?.end_date);
    const schedule = scheduleChanged ? {
      start_date: new Date(values.start_date).toISOString(),
      end_date: new Date(values.end_date).toISOString(),
      ...(editActivityDialog ? {
        expected_start_date: editingActivity.start_date ?? null,
        expected_end_date: editingActivity.end_date ?? null,
      } : {}),
    } : {};
    try {
      if (addActivityDialog) {
        const res = await AddTaskActivity({
          task_id: params.taskid,
          activity: values.activity_name,
          description: values.description,
          ...schedule,
        });
        if (res?.status !== 201) {
          toast.error(res?.data?.message || "Failed to add activity");
          return;
        }
        toast.success(res.data?.message || "Activity added");
      } else if (editActivityDialog) {
        const res = await UpdateTaskActivity({
          activity_id: editingActivity._id,
          activity: values.activity_name,
          description: values.description,
          is_status: false,
          ...schedule,
        });
        if (res?.status !== 200) {
          toast.error(res?.message || "Failed to update activity");
          return;
        }
        toast.success(res.message || "Activity updated");
      }
      setAddActivityDialog(false);
      setEditActivityDialog(false);
      setEditingActivity(null);
      activityForm.reset();
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save activity");
    }
  };

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
    const updateData = {
      task_id: params.taskid,
      task_name: values.task_name,
      task_description: values.task_description,
      priority: values.priority || undefined,
      is_project_task: taskData?.is_project_task,
      ...(!taskData?.is_project_task ? { assigned_to: taskData?.assigned_to || null } : {}),
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
      router.push(`/staff/projects/${taskData.project_id}?section=tasks`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center">
        <LoaderSpin size={40} />
      </div>
    );
  }

  if (isError && !taskData) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const message = status === 401
      ? "Your session has expired. Please sign in again."
      : status === 403
        ? "You do not have permission to view this task."
        : status === 404
          ? "Task not found."
          : "Unable to load this task. Please try again.";

    return (
      <div className="p-5 text-slate-300 space-y-3" role="alert">
        <p>{message}</p>
        <Button onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Retrying..." : "Retry"}
        </Button>
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

        {taskData.is_project_task ? (
          <ProjectTaskHeaderSummary
            activityCount={visibleActivityCount}
            completedActivityCount={visibleCompletedActivityCount}
            teams={Array.isArray(taskData.assigned_teams) ? taskData.assigned_teams : []}
            projectName={taskData.project_details?.project_name}
            startDate={taskData.start_date}
            endDate={taskData.end_date}
          />
        ) : (
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
                {taskData.assigned_user?.name || "Not assigned"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Start · calculated</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">
                {formatScheduleDate(taskData.start_date)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">End · calculated</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">
                {formatScheduleDate(taskData.end_date)}
              </p>
            </div>
          </div>
        )}

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
          {canAddActivity && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
              onClick={() => {
                activityForm.reset({ activity_name: "", description: "", start_date: "", end_date: "" });
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
                      <p className="mt-2 text-xs text-slate-400">
                        Start: {formatScheduleDate(activity.start_date)}<br />
                        End: {formatScheduleDate(activity.end_date)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {activity?.assigned_skill?.skill_name && (
                          <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                            Skill: {activity.assigned_skill.skill_name}
                          </span>
                        )}
                        {activity?.forwarded_to?._id && (
                          (activity.canChangeStatus && (taskData.is_project_task ? canAssignActivities : isHead)) ? (
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
                      {(activity.canChangeStatus && (taskData.is_project_task ? canAssignActivities : isHead)) && (
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
                      {activity.canChangeStatus && (activity?.is_done ? (
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
                      ))}
                      {isCreator && (
                        <>
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                            onClick={() => {
                              setEditingActivity(activity);
                              activityForm.reset({
                                activity_name: activity.activity,
                                description: activity.description || "",
                                start_date: toLocalDateTimeInput(activity.start_date),
                                end_date: toLocalDateTimeInput(activity.end_date),
                              });
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
        <DialogContent className="overflow-hidden border-slate-800 bg-slate-950 sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Reassign Activity</DialogTitle>
            <DialogDescription>
              {taskData?.is_project_task
                ? `Reassign ${activeActivity?.activity || "this activity"} to a head or member of the selected teams.`
                : `Reassign ${activeActivity?.activity || "this activity"} to one of your staffs or another department HEAD.`}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={assignTab} onValueChange={handleAssignTabChange}>
            <TabsList className={`grid h-auto w-full gap-2 bg-transparent p-0 ${taskData?.is_project_task ? "grid-cols-1" : "grid-cols-2"}`}>
              <TabsTrigger
                value="staffs"
                className="h-10 border border-slate-700 bg-slate-900/60 text-xs text-slate-300 data-[state=active]:border-cyan-500/60 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-200"
              >
                <UserPlus className="mr-2 size-4" />
                {taskData?.is_project_task ? "Selected Team People" : "Your Staffs"}
              </TabsTrigger>
              {!taskData?.is_project_task && <TabsTrigger
                value="departments"
                className="h-10 border border-slate-700 bg-slate-900/60 text-xs text-slate-300 data-[state=active]:border-cyan-500/60 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-200"
              >
                <Building2 className="mr-2 size-4" />
                Other Departments
              </TabsTrigger>}
            </TabsList>

            <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-900/60 p-3">
              <Input
                placeholder={
                  assignTab === "departments"
                    ? "Search by department or HEAD..."
                    : "Search your staffs..."
                }
                value={staffSearch}
                onChange={(event) => setStaffSearch(event.target.value)}
                className="border-slate-700 bg-slate-950/70"
              />

              <TabsContent value="staffs" className="mt-3">
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {loadingStaffs && (
                    <div className="flex h-[140px] w-full items-center justify-center">
                      <LoaderSpin size={20} />
                    </div>
                  )}
                  {!loadingStaffs && filteredStaffs.length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-500">
                      No matching staff found.
                    </p>
                  )}
                  {!loadingStaffs &&
                    filteredStaffs.map((staff: any) => {
                      const selected = selectedStaff?._id === staff._id;
                      return (
                        <button
                          key={staff._id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedStaff(selected ? null : staff)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected
                              ? "border-cyan-500/60 bg-cyan-500/10"
                              : "border-slate-800 bg-slate-950/30 hover:border-slate-600"
                          }`}
                        >
                          <Avatar src={staff?.avatar_url || "/avatar.png"} size={34} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-200">{staff.name}</p>
                            <p className="truncate text-xs text-slate-500">{staff.email}</p>
                          </div>
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-cyan-400 bg-cyan-500 text-slate-950"
                                : "border-slate-600 bg-slate-950"
                            }`}
                          >
                            {selected && <Check className="size-4" />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </TabsContent>

              <TabsContent value="departments" className="mt-3">
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {loadingHierarchyHeads && (
                    <div className="flex h-[140px] w-full items-center justify-center">
                      <LoaderSpin size={20} />
                    </div>
                  )}
                  {!loadingHierarchyHeads && hierarchyHeadsError && (
                    <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 text-center">
                      <p className="text-xs text-red-300">{hierarchyHeadsError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadHierarchyHeads}
                        className="border-slate-700"
                      >
                        <RefreshCw className="mr-2 size-3.5" />
                        Retry
                      </Button>
                    </div>
                  )}
                  {!loadingHierarchyHeads &&
                    !hierarchyHeadsError &&
                    hierarchyHeadsLoaded &&
                    filteredHierarchyHeads.length === 0 && (
                      <p className="py-8 text-center text-xs text-slate-500">
                        No matching department HEAD found.
                      </p>
                    )}
                  {!loadingHierarchyHeads &&
                    !hierarchyHeadsError &&
                    filteredHierarchyHeads.map((head: any) => {
                      const selected = selectedStaff?._id === head._id;
                      const domainNames = (head?.domains || [])
                        .map((domain: any) => domain?.name)
                        .filter(Boolean);
                      return (
                        <button
                          key={head._id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedStaff(selected ? null : head)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected
                              ? "border-cyan-500/60 bg-cyan-500/10"
                              : "border-slate-800 bg-slate-950/30 hover:border-slate-600"
                          }`}
                        >
                          <Avatar src={head?.avatar_url || "/avatar.png"} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {head.name || "HEAD"}
                            </p>
                            <p className="truncate text-xs text-slate-500">{head.email}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] text-cyan-300/80">
                              {domainNames.join(" | ") || "No domains"}
                            </p>
                          </div>
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-cyan-400 bg-cyan-500 text-slate-950"
                                : "border-slate-600 bg-slate-950"
                            }`}
                          >
                            {selected && <Check className="size-4" />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </TabsContent>
            </div>
          </Tabs>
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

      <ActivityHistorySheet
        activity={historyActivity}
        creator={taskData?.creator_details}
        open={historySheetOpen}
        onOpenChange={(open) => (open ? setHistorySheetOpen(true) : handleCloseHistory())}
      />

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
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
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
                <ActivityScheduleFields disabled={Boolean(editActivityDialog && editingActivity?.is_done)} />
                <FormField
                  control={activityForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex min-h-0 flex-1 flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the activity description..."
                          className="min-h-32 flex-1 resize-none border-slate-700 bg-slate-900/40 p-4 leading-relaxed text-slate-200 focus-visible:border-cyan-600 focus-visible:ring-cyan-700/40"
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
          {editingActivity && (
            <div className="shrink-0 border-b border-slate-800 px-6 py-3">
              <ChangeActivityDeadlineDialog
                activity={taskData?.activities?.find((activity: any) => String(activity._id) === String(editingActivity._id)) || editingActivity}
                onChanged={(period) => {
                  setEditingActivity((current: any) => ({ ...current, ...period }));
                  activityForm.setValue("start_date", toLocalDateTimeInput(period.start_date));
                  activityForm.setValue("end_date", toLocalDateTimeInput(period.end_date));
                }}
              />
            </div>
          )}
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
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
                <ActivityScheduleFields disabled={Boolean(editActivityDialog && editingActivity?.is_done)} />
                <FormField
                  control={activityForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex min-h-0 flex-1 flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-300">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the activity description..."
                          className="min-h-32 flex-1 resize-none border-slate-700 bg-slate-900/40 p-4 leading-relaxed text-slate-200 focus-visible:border-cyan-600 focus-visible:ring-cyan-700/40"
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
                    <FormControl>
                      <Textarea
                        placeholder="Task description"
                        rows={3}
                        className="min-h-[96px] border-slate-600 focus:border-slate-400"
                        {...field}
                      />
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
