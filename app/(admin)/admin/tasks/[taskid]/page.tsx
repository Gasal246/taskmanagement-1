"use client";

import React, { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  CheckCircle,
  CheckCircle2,
  Edit,
  ListTodo,
  Navigation,
  PencilRuler,
  PlusCircle,
  Search,
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useAddTaskActivity,
  useDeleteBusinessTask,
  useDeleteTaskActivity,
  useGetBusinessStaffsBySkill,
  useGetBusinessSkills,
  useGetTaskById,
  useUpdateBusinessTask,
  useUpdateTaskActivity,
} from "@/query/business/queries";
import { toast } from "sonner";
import { formatDateTiny } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useGetBusinessStaffs } from "@/query/user/queries";
import { TASK_STATUS } from "@/lib/constants";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Button } from "@/components/ui/button";
import { Avatar } from "antd";

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

// Validation schema for activity form
const activitySchema = z.object({
  activity_name: z.string().min(2, { message: "Activity name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  _id: z.string().optional(),
});

// Validation schema for task form
const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  status: z.string(),
  assigned_team_id: z.string().optional(),
  assigned_user_id: z.string().optional(),
});

const TaskDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ taskid: string }>();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: task, isLoading, refetch } = useGetTaskById(params.taskid);
  const { mutateAsync: AddTaskActivity, isPending: isAddingActivity } = useAddTaskActivity();
  const { mutateAsync: UpdateTaskActivity, isPending: isUpdatingActivity } = useUpdateTaskActivity();
  const { mutateAsync: DeleteTaskActivity, isPending: isDeletingActivity } = useDeleteTaskActivity();
  const { mutateAsync: UpdateTask, isPending: isUpdatingTask } = useUpdateBusinessTask();
  const { mutateAsync: DeleteTask, isPending: isDeletingTask } = useDeleteBusinessTask();
  const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(
    businessData?._id
  );
  const { mutateAsync: getSkills, isPending: loadingSkills } = useGetBusinessSkills();
  const { mutateAsync: getStaffsBySkill, isPending: loadingStaffsBySkill } =
    useGetBusinessStaffsBySkill();

  const [addActivityDialog, setAddActivityDialog] = useState(false);
  const [editActivityDialog, setEditActivityDialog] = useState(false);
  const [deleteActivityDialog, setDeleteActivityDialog] = useState(false);
  const [editTaskDialog, setEditTaskDialog] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectSkillDialogOpen, setSelectSkillDialogOpen] = useState(false);
  const [selectStaffDialogOpen, setSelectStaffDialogOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatusActivity, setPendingStatusActivity] = useState<any>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState<boolean | null>(null);

  const taskData = task?.data;
  const isProjectTask = Boolean(taskData?.is_project_task);
  const progress = getProgressValue(
    Number(taskData?.completed_activity || 0),
    Number(taskData?.activity_count || 0)
  );

  // Activity form
  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_name: "",
      description: "",
    },
  });

  // Task form
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      status: "To Do",
      assigned_team_id: "",
      assigned_user_id: "",
    },
  });

  useEffect(() => {
    if (loadedStaffs) {
      const filtered = loadedStaffs.filter((user: any) =>
        user?.user_id?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
      setIsDropdownOpen(searchTerm.length > 0 && filtered.length > 0);
    }
  }, [searchTerm, loadedStaffs]);

  useEffect(() => {
    if (!taskData) return;
    taskForm.setValue("task_name", taskData.task_name);
    taskForm.setValue("task_description", taskData.task_description || "");
    taskForm.setValue("status", taskData.status);

    if (!taskData.is_project_task && loadedStaffs) {
      taskForm.setValue("assigned_user_id", taskData.assigned_to || "");
      const assignedUser = loadedStaffs?.find(
        (user: any) => user?.user_id?._id === taskData.assigned_to
      );
      if (assignedUser) {
        setSelectedUser(assignedUser);
        setSearchTerm(assignedUser.user_id.name);
      }
    } else if (taskData.is_project_task) {
      setSelectedUser(null);
      setSearchTerm("");
    }
  }, [taskData, loadedStaffs, taskForm]);

  useEffect(() => {
    if (!selectSkillDialogOpen || !businessData?._id) return;
    const fetchSkills = async () => {
      const res = await getSkills(businessData._id);
      if (res?.status === 200) {
        setSkills(res?.data || []);
      } else {
        setSkills([]);
      }
    };
    fetchSkills();
  }, [selectSkillDialogOpen, businessData?._id, getSkills]);

  useEffect(() => {
    if (!selectStaffDialogOpen || !selectedSkill?._id || !businessData?._id) return;
    const fetchStaffs = async () => {
      const res = await getStaffsBySkill({
        business_id: businessData._id,
        skill_id: selectedSkill._id,
      });
      if (res?.status === 200) {
        setStaffOptions(res?.data || []);
      } else {
        setStaffOptions([]);
      }
    };
    fetchStaffs();
  }, [selectStaffDialogOpen, selectedSkill?._id, businessData?._id, getStaffsBySkill]);

  const handleAddActivity = () => {
    activityForm.reset();
    setAddActivityDialog(true);
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    activityForm.setValue("activity_name", activity.activity);
    activityForm.setValue("description", activity.description || "");
    setEditActivityDialog(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    setSelectedActivityId(activityId);
    setDeleteActivityDialog(true);
  };

  const handleEditTask = () => {
    setEditTaskDialog(true);
  };

  const handleUserSelect = (user: any) => {
    if (user) {
      taskForm.setValue("assigned_user_id", user.user_id._id);
      setSearchTerm(user.user_id.name);
      setSelectedUser(user);
      setIsDropdownOpen(false);
    }
  };

  const handleOpenAssignDialog = (activity: any) => {
    setActiveActivity(activity);
    setSelectedSkill(activity?.assigned_skill || null);
    setSelectedStaff(activity?.assigned_to || null);
    setSkillSearch("");
    setStaffSearch("");
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectSkillDialogOpen(false);
    setSelectStaffDialogOpen(false);
    setActiveActivity(null);
    setSelectedSkill(null);
    setSelectedStaff(null);
    setSkillSearch("");
    setStaffSearch("");
    setSkills([]);
    setStaffOptions([]);
  };

  const handleSelectSkill = (skill: any) => {
    setSelectedSkill(skill);
    setSelectedStaff(null);
    setStaffOptions([]);
    setSelectSkillDialogOpen(false);
  };

  const handleSelectStaff = (staff: any) => {
    setSelectedStaff(staff?.user_id || null);
    setSelectStaffDialogOpen(false);
  };

  const handleAssignActivity = async () => {
    if (!activeActivity?._id) return;
    if (!selectedSkill?._id) {
      toast.error("Please select a skill first.");
      return;
    }
    if (!selectedStaff?._id) {
      toast.error("Please select a staff member.");
      return;
    }
    const res = await UpdateTaskActivity({
      activity_id: activeActivity._id,
      assigned_to: selectedStaff._id,
      assigned_skill: selectedSkill._id,
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
      if (res?.status == 201) {
        toast.success(res?.data.message);
      } else {
        toast.error(res?.data.message);
      }
    } else if (editActivityDialog) {
      const editData = {
        activity_id: editingActivity._id,
        activity: values.activity_name,
        description: values.description,
        is_status: false,
      };
      const res = await UpdateTaskActivity(editData);
      if (res?.status == 200) {
        toast.success(res?.message || "Activity updated.");
      } else {
        toast.error(res?.message || "Failed to update activity.");
      }
    }
    setAddActivityDialog(false);
    setEditActivityDialog(false);
    setEditingActivity(null);
    refetch();
  };

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
    const assignedTo = taskData?.is_project_task
      ? taskData?.assigned_teams || taskData?.assigned_team?._id || null
      : selectedUser?.user_id?._id || taskData?.assigned_to || null;
    const updateData = {
      task_id: params.taskid,
      task_name: values.task_name,
      task_description: values.task_description,
      status: values.status,
      is_project_task: taskData?.is_project_task,
      assigned_to: assignedTo,
    };
    const res = await UpdateTask(updateData);
    if (res?.status == 200) {
      toast.success(res?.data?.message || "Task updated successfully");
    } else {
      toast.error(res?.data?.message || "Failed to update task");
    }
    setEditTaskDialog(false);
    setSearchTerm("");
    setSelectedUser(null);
    setIsDropdownOpen(false);
    refetch();
  };

  const onDeleteActivityConfirm = async () => {
    if (selectedActivityId) {
      const res = await DeleteTaskActivity(selectedActivityId);
      if (res?.status == 203) {
        toast.success(res?.data?.message);
      } else {
        toast.error(res?.data?.message || "Failed to delete activity.");
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
      router.push("/admin/tasks");
    } else {
      toast.error(res?.data?.message || "Failed to delete task");
    }
    setDeleteTaskDialog(false);
  };

  const handleNavigateToProject = () => {
    if (taskData?.project_id) {
      router.push(`/admin/projects/${taskData.project_id}`);
    }
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
    if (res?.status == 200) {
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

  const skillSearchTerm = skillSearch.trim().toLowerCase();
  const filteredSkills = skills.filter((skill: any) => {
    const name = skill?.skill_name || "";
    return name.toLowerCase().includes(skillSearchTerm);
  });

  const staffSearchTerm = staffSearch.trim().toLowerCase();
  const filteredStaffs = staffOptions.filter((staff: any) => {
    const name = staff?.user_id?.name || "";
    const email = staff?.user_id?.email || "";
    return `${name} ${email}`.toLowerCase().includes(staffSearchTerm);
  });

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
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              {taskData.task_description || "No description added."}
            </p>
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
              onClick={handleEditTask}
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
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Activities</p>
            <p className="text-base font-semibold text-slate-100 mt-1">
              {taskData.activity_count || 0}
            </p>
            <p className="text-xs text-slate-400">
              Completed {taskData.completed_activity || 0}
            </p>
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
          <span className="text-xs font-semibold text-slate-200 w-12 text-right">
            {progress}%
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-sm text-slate-300 flex items-center gap-1">
            <ListTodo size={16} /> Activities
          </h2>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
            onClick={handleAddActivity}
          >
            <PlusCircle size={12} />
            Add Activity
          </motion.div>
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
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                        onClick={() => handleOpenAssignDialog(activity)}
                      >
                        <UserPlus size={12} />
                        {activity?.assigned_to ? "Change Assignment" : "Assign"}
                      </motion.button>
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
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                        onClick={() => handleEditActivity(activity)}
                      >
                        <PencilRuler size={14} />
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                        onClick={() => handleDeleteActivity(activity._id)}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </motion.div>
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Assign Activity</DialogTitle>
            <DialogDescription>
              Assign a skill and staff member to {activeActivity?.activity || "this activity"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Select Skill</p>
                  <p className="text-sm font-medium text-slate-200">
                    {selectedSkill?.skill_name || "No skill selected"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-200"
                  onClick={() => setSelectSkillDialogOpen(true)}
                >
                  Add
                </Button>
              </div>
            </div>
            <div
              className={`rounded-lg border border-slate-800/70 bg-slate-900/60 p-3 ${
                !selectedSkill ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Select Staff</p>
                  <p className="text-sm font-medium text-slate-200">
                    {selectedStaff?.name || "No staff selected"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-200"
                  onClick={() => setSelectStaffDialogOpen(true)}
                  disabled={!selectedSkill}
                >
                  Add
                </Button>
              </div>
              {!selectedSkill && (
                <p className="text-[11px] text-slate-500 mt-2">
                  Select a skill to load matching staff.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={handleCloseAssignDialog}>
              Cancel
            </Button>
            <Button onClick={handleAssignActivity} disabled={isUpdatingActivity}>
              {isUpdatingActivity ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Skill Dialog */}
      <Dialog open={selectSkillDialogOpen} onOpenChange={setSelectSkillDialogOpen}>
        <DialogContent className="sm:max-w-[420px] max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Skill</DialogTitle>
            <DialogDescription>Choose a skill to match staff for this activity.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
          />
          <div className="relative flex-1 overflow-y-auto pb-2">
            {loadingSkills && (
              <div className="w-full h-[10vh] flex items-center justify-center">
                <LoaderSpin size={22} />
              </div>
            )}
            {!loadingSkills && filteredSkills.length === 0 && (
              <div className="w-full h-[10vh] flex items-center justify-center">
                <p className="text-xs text-slate-400">No skills found.</p>
              </div>
            )}
            {filteredSkills.map((skill: any) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={skill?._id}
                className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-between mt-2 relative"
                onClick={() => handleSelectSkill(skill)}
              >
                <span className="text-xs text-slate-200">{skill?.skill_name}</span>
                {selectedSkill?._id === skill?._id && (
                  <Check className="text-cyan-600" strokeWidth={3} size={16} />
                )}
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Select Staff Dialog */}
      <Dialog open={selectStaffDialogOpen} onOpenChange={setSelectStaffDialogOpen}>
        <DialogContent className="sm:max-w-[420px] max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Staff</DialogTitle>
            <DialogDescription>Select a staff member with the chosen skill.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search staff by name"
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
          />
          <div className="relative flex-1 overflow-y-auto pb-2">
            {loadingStaffsBySkill && (
              <div className="w-full h-[10vh] flex items-center justify-center">
                <LoaderSpin size={22} />
              </div>
            )}
            {!loadingStaffsBySkill && filteredStaffs.length === 0 && (
              <div className="w-full h-[10vh] flex items-center justify-center">
                <p className="text-xs text-slate-400">No matching staff found.</p>
              </div>
            )}
            {filteredStaffs.map((staff: any) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={staff?._id}
                className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 px-4 border border-slate-700 hover:border-cyan-600 justify-between mt-2 relative"
                onClick={() => handleSelectStaff(staff)}
              >
                <div className="flex items-center gap-2">
                  <Avatar src={staff?.user_id?.avatar_url || "/avatar.png"} size={30} />
                  <div>
                    <p className="text-xs text-slate-200">{staff?.user_id?.name}</p>
                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                  </div>
                </div>
                {selectedStaff?._id === staff?.user_id?._id && (
                  <Check className="text-cyan-600" strokeWidth={3} size={16} />
                )}
              </motion.div>
            ))}
          </div>
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
              {!isProjectTask && (
                <FormField
                  control={taskForm.control}
                  name="assigned_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Assigned User
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="relative mb-2">
                            <Input
                              placeholder="Search for a user..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onFocus={() => {
                                if (filteredUsers.length > 0) setIsDropdownOpen(true);
                              }}
                              onBlur={() => {
                                setTimeout(() => setIsDropdownOpen(false), 200);
                              }}
                              className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8"
                              disabled={loadingStaffData}
                            />
                            <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                          </div>
                          {isDropdownOpen && (
                            <div className="max-h-[150px] overflow-y-auto rounded-md bg-slate-900 border border-slate-700 shadow-lg z-10">
                              {filteredUsers.length === 0 && searchTerm !== "" ? (
                                <div className="p-2 text-xs text-slate-400">No users found.</div>
                              ) : (
                                filteredUsers.map((user: any) => (
                                  <div
                                    key={user._id}
                                    className={`p-2 text-xs text-slate-300 cursor-pointer hover:bg-slate-800 ${
                                      selectedUser?.user_id?._id === user.user_id._id ? "bg-slate-700" : ""
                                    }`}
                                    onClick={() => handleUserSelect(user)}
                                  >
                                    {user.user_id.name}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {loadingStaffData && (
                            <p className="text-xs text-slate-400 mt-1">Loading users...</p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="w-full flex items-center justify-end">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold"
                  disabled={isUpdatingTask || loadingStaffData}
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

export default TaskDetailPage;
