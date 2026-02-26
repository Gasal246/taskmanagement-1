"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  CheckCircle2,
  Edit,
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
  useGetDeptsforLoation,
  useGetLocationsandDeptsForArea,
  useGetAreasandDeptsForRegion,
  useGetStaffsByDepartment,
  useGetTaskById,
  useUpdateBusinessTask,
  useUpdateTaskActivity,
} from "@/query/business/queries";
import { toast } from "sonner";
import { formatDateTiny } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_STATUS } from "@/lib/constants";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Button } from "@/components/ui/button";
import { Avatar } from "antd";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";

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
  const { data: task, isLoading, refetch } = useGetTaskById(params.taskid);
  const { mutateAsync: AddTaskActivity, isPending: isAddingActivity } = useAddTaskActivity();
  const { mutateAsync: UpdateTaskActivity, isPending: isUpdatingActivity } = useUpdateTaskActivity();
  const { mutateAsync: DeleteTaskActivity, isPending: isDeletingActivity } = useDeleteTaskActivity();
  const { mutateAsync: UpdateTask, isPending: isUpdatingTask } = useUpdateBusinessTask();
  const { mutateAsync: DeleteTask, isPending: isDeletingTask } = useDeleteBusinessTask();
  const { mutateAsync: getMyStaffs } = useGetAllStaffsForStaff();
  const { mutateAsync: getStaffsByDepartment } = useGetStaffsByDepartment();
  const { mutateAsync: getAreasAndDeptsForRegion } = useGetAreasandDeptsForRegion();
  const { mutateAsync: getLocationsAndDeptsForArea } = useGetLocationsandDeptsForArea();
  const { mutateAsync: getDeptsForLocation } = useGetDeptsforLoation();

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
  const [assignScope, setAssignScope] = useState<"my" | "other">("my");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  const [departmentTree, setDepartmentTree] = useState<any>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [activeActivity, setActiveActivity] = useState<any>(null);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatusActivity, setPendingStatusActivity] = useState<any>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState<boolean | null>(null);

  const taskData = task?.data;
  const isProjectTask = Boolean(taskData?.is_project_task);
  const progress = getProgressValue(
    Number(taskData?.completed_activity || 0),
    Number(taskData?.activity_count || 0)
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

  const fetchDepartmentMeta = async (departmentId: string) => {
    const response = await fetch(`/api/department/get-meta?department_id=${departmentId}`);
    const data = await response.json();
    return data?.data;
  };

  const loadMyStaffs = async () => {
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
  };

  const loadDepartmentTree = async () => {
    if (!roleName || !domainData) return;
    setLoadingDepartments(true);

    if (roleName.includes("REGION")) {
      let regionId = roleName === "REGION_HEAD" ? domainData?.region_id : null;
      if (!regionId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        regionId = meta?.region_id || null;
      }
      if (!regionId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const regionRes = await getAreasAndDeptsForRegion(regionId);
      const regionDepartments = regionRes?.data?.region_departments || [];
      const areas = regionRes?.data?.areas || [];
      const areaNodes = await Promise.all(
        areas.map(async (area: any) => {
          const areaRes = await getLocationsAndDeptsForArea(area._id);
          const areaDepartments = areaRes?.data?.area_departments || [];
          const locations = areaRes?.data?.locations || [];
          const locationNodes = await Promise.all(
            locations.map(async (location: any) => {
              const locRes = await getDeptsForLocation(location._id);
              return {
                location: locRes?.data?.location || location,
                locationDepartments: locRes?.data?.location_departments || [],
              };
            })
          );
          return {
            area: areaRes?.data?.area || area,
            areaDepartments,
            locations: locationNodes,
          };
        })
      );
      setDepartmentTree({ mode: "region", regionDepartments, areas: areaNodes });
      setLoadingDepartments(false);
      return;
    }

    if (roleName.includes("AREA")) {
      let areaId = roleName === "AREA_HEAD" ? domainData?.area_id : null;
      if (!areaId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        areaId = meta?.area_id || null;
      }
      if (!areaId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const areaRes = await getLocationsAndDeptsForArea(areaId);
      const areaDepartments = areaRes?.data?.area_departments || [];
      const locations = areaRes?.data?.locations || [];
      const locationNodes = await Promise.all(
        locations.map(async (location: any) => {
          const locRes = await getDeptsForLocation(location._id);
          return {
            location: locRes?.data?.location || location,
            locationDepartments: locRes?.data?.location_departments || [],
          };
        })
      );
      setDepartmentTree({ mode: "area", area: areaRes?.data?.area || null, areaDepartments, locations: locationNodes });
      setLoadingDepartments(false);
      return;
    }

    if (roleName.includes("LOCATION")) {
      let locationId = roleName === "LOCATION_HEAD" ? domainData?.location_id : null;
      if (!locationId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        locationId = meta?.location_id || null;
      }
      if (!locationId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const locationRes = await getDeptsForLocation(locationId);
      setDepartmentTree({
        mode: "location",
        location: locationRes?.data?.location || null,
        locationDepartments: locationRes?.data?.location_departments || [],
      });
      setLoadingDepartments(false);
      return;
    }

    setDepartmentTree(null);
    setLoadingDepartments(false);
  };

  const handleSelectDepartment = async (department: any) => {
    if (!department?._id) return;
    setSelectedDepartmentId(department._id);
    setSelectedDepartmentName(department?.dep_name || department?.department_name || "Department");
    setSelectedStaff(null);
    setLoadingStaffs(true);
    const res = await getStaffsByDepartment(department._id);
    if (res?.status === 200) {
      setStaffOptions((res?.data || []).map(normalizeStaff));
    } else {
      setStaffOptions([]);
    }
    setLoadingStaffs(false);
  };

  const handleOpenAssignDialog = (activity: any) => {
    setActiveActivity(activity);
    setAssignScope("my");
    setSelectedDepartmentId(null);
    setSelectedDepartmentName("");
    setSelectedStaff(null);
    setStaffSearch("");
    setDepartmentTree(null);
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedDepartmentId(null);
    setSelectedDepartmentName("");
    setSelectedStaff(null);
    setStaffSearch("");
    setStaffOptions([]);
  };

  useEffect(() => {
    if (!assignDialogOpen) return;
    if (assignScope === "my") {
      loadMyStaffs();
    } else {
      loadDepartmentTree();
    }
  }, [assignDialogOpen, assignScope]);

  const filteredStaffs = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    if (!term) return staffOptions;
    return staffOptions.filter((staff) => {
      const name = staff?.name || "";
      const email = staff?.email || "";
      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [staffOptions, staffSearch]);

  const handleAssignActivity = async () => {
    if (!activeActivity?._id) return;
    if (!selectedStaff?._id) {
      toast.error("Please select a staff member.");
      return;
    }
    const res = await UpdateTaskActivity({
      activity_id: activeActivity._id,
      assigned_to: selectedStaff._id,
      is_status: false,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Activity assigned successfully.");
      handleCloseAssignDialog();
      refetch();
    } else {
      toast.error(res?.message || "Failed to assign activity.");
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
              {taskData.activity_count || 0}
            </p>
            <p className="text-xs text-slate-400">Completed {taskData.completed_activity || 0}</p>
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
              onClick={() => setAddActivityDialog(true)}
            >
              <PlusCircle size={12} />
              Add Activity
            </motion.div>
          )}
        </div>

        <div className="flex flex-wrap">
          {taskData.activities?.length > 0 ? (
            taskData.activities.map((activity: any) => (
              <div key={activity._id} className="w-full p-1">
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-200">{activity.activity}</p>
                      <p className="text-xs text-slate-400">
                        {activity.description || "No description."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                          Skill: {activity?.assigned_skill?.skill_name || "Not set"}
                        </span>
                        <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                          Staff: {activity?.assigned_to?.name || "Unassigned"}
                        </span>
                      </div>
                      {activity?.is_done && activity?.completed_in && (
                        <p className="text-xs text-slate-400 mt-2">
                          Completed In: <span className="font-semibold">{formatDuration(activity.completed_in)}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isProjectTask && isCreator && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenAssignDialog(activity)}
                        >
                          <UserPlus size={12} />
                          {activity?.assigned_to ? "Change Assignment" : "Assign"}
                        </motion.button>
                      )}
                      {activity?.is_done ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenStatusConfirm(activity, false)}
                        >
                          <CheckCircle2 size={12} />
                          Mark as Not Completed
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                          onClick={() => handleOpenStatusConfirm(activity, true)}
                        >
                          <CheckCircle size={12} />
                          Mark as Completed
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

      {/* Assign Activity Dialog */}
      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => (open ? setAssignDialogOpen(true) : handleCloseAssignDialog())}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Assign Activity</DialogTitle>
            <DialogDescription>
              Choose a department and staff member for {activeActivity?.activity || "this activity"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignScope("my");
                  setSelectedDepartmentId(null);
                  setSelectedDepartmentName("");
                  setStaffOptions([]);
                  setSelectedStaff(null);
                  setStaffSearch("");
                }}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  assignScope === "my"
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                My Department
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignScope("other");
                  setSelectedDepartmentId(null);
                  setSelectedDepartmentName("");
                  setStaffOptions([]);
                  setSelectedStaff(null);
                  setStaffSearch("");
                }}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  assignScope === "other"
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                Other Department
              </button>
            </div>

            {assignScope === "other" && (
              <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                <p className="text-xs text-slate-400 mb-2">Departments</p>
                {loadingDepartments && (
                  <div className="w-full flex items-center justify-center h-[12vh]">
                    <LoaderSpin size={20} />
                  </div>
                )}
                {!loadingDepartments && !departmentTree && (
                  <p className="text-xs text-slate-500">No departments available.</p>
                )}
                {!loadingDepartments && departmentTree?.mode === "region" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] uppercase text-slate-500 mb-2">Region Departments</p>
                      <div className="flex flex-wrap gap-2">
                        {departmentTree.regionDepartments?.map((dept: any) => (
                          <button
                            key={dept._id}
                            type="button"
                            onClick={() => handleSelectDepartment(dept)}
                            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                              selectedDepartmentId === dept._id
                                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {dept.dep_name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Accordion type="multiple" className="border-t border-slate-800/60">
                      {departmentTree.areas?.map((areaNode: any) => (
                        <AccordionItem key={areaNode.area?._id} value={areaNode.area?._id}>
                          <AccordionTrigger className="text-slate-200">
                            {areaNode.area?.area_name || "Area"}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase text-slate-500">Area Departments</p>
                              <div className="flex flex-wrap gap-2">
                                {areaNode.areaDepartments?.map((dept: any) => (
                                  <button
                                    key={dept._id}
                                    type="button"
                                    onClick={() => handleSelectDepartment(dept)}
                                    className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                      selectedDepartmentId === dept._id
                                        ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                  >
                                    {dept.dep_name}
                                  </button>
                                ))}
                              </div>
                              <Accordion type="multiple" className="border-l border-slate-800/60 pl-3">
                                {areaNode.locations?.map((locationNode: any) => (
                                  <AccordionItem
                                    key={locationNode.location?._id}
                                    value={locationNode.location?._id}
                                  >
                                    <AccordionTrigger className="text-slate-300">
                                      {locationNode.location?.location_name || "Location"}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="flex flex-wrap gap-2">
                                        {locationNode.locationDepartments?.map((dept: any) => (
                                          <button
                                            key={dept._id}
                                            type="button"
                                            onClick={() => handleSelectDepartment(dept)}
                                            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                              selectedDepartmentId === dept._id
                                                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                                            }`}
                                          >
                                            {dept.dep_name}
                                          </button>
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {!loadingDepartments && departmentTree?.mode === "area" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] uppercase text-slate-500 mb-2">Area Departments</p>
                      <div className="flex flex-wrap gap-2">
                        {departmentTree.areaDepartments?.map((dept: any) => (
                          <button
                            key={dept._id}
                            type="button"
                            onClick={() => handleSelectDepartment(dept)}
                            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                              selectedDepartmentId === dept._id
                                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {dept.dep_name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Accordion type="multiple" className="border-t border-slate-800/60">
                      {departmentTree.locations?.map((locationNode: any) => (
                        <AccordionItem
                          key={locationNode.location?._id}
                          value={locationNode.location?._id}
                        >
                          <AccordionTrigger className="text-slate-200">
                            {locationNode.location?.location_name || "Location"}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-wrap gap-2">
                              {locationNode.locationDepartments?.map((dept: any) => (
                                <button
                                  key={dept._id}
                                  type="button"
                                  onClick={() => handleSelectDepartment(dept)}
                                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                    selectedDepartmentId === dept._id
                                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {dept.dep_name}
                                </button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {!loadingDepartments && departmentTree?.mode === "location" && (
                  <div>
                    <p className="text-[11px] uppercase text-slate-500 mb-2">Location Departments</p>
                    <div className="flex flex-wrap gap-2">
                      {departmentTree.locationDepartments?.map((dept: any) => (
                        <button
                          key={dept._id}
                          type="button"
                          onClick={() => handleSelectDepartment(dept)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                            selectedDepartmentId === dept._id
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {dept.dep_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400">Selected Department</p>
                  <p className="text-sm text-slate-200">
                    {assignScope === "my"
                      ? "My Department"
                      : selectedDepartmentName || "Select a department"}
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {assignScope === "other" && !selectedDepartmentId
                    ? "Select a department to load staff"
                    : ""}
                </div>
              </div>
              <div className="mt-3">
                <Input
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>
              <div className="mt-3 max-h-[240px] overflow-y-auto space-y-2">
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
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={handleCloseAssignDialog}>
              Cancel
            </Button>
            <Button onClick={handleAssignActivity} disabled={isUpdatingActivity || !selectedStaff?._id}>
              {isUpdatingActivity ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={addActivityDialog} onOpenChange={setAddActivityDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>Add a new activity to the task.</DialogDescription>
          </DialogHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="space-y-3">
              <FormField
                control={activityForm.control}
                name="activity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Activity Name
                    </FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Activity name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={activityForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Description</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Activity description" {...field} />
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
                  disabled={isAddingActivity}
                >
                  {isAddingActivity ? "Adding..." : "Add Activity"}
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={editActivityDialog} onOpenChange={setEditActivityDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>Edit the activity details.</DialogDescription>
          </DialogHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="space-y-3">
              <FormField
                control={activityForm.control}
                name="activity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Activity Name
                    </FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Activity name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={activityForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Description</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Activity description" {...field} />
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
                  disabled={isUpdatingActivity}
                >
                  {isUpdatingActivity ? "Updating..." : "Update Activity"}
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
