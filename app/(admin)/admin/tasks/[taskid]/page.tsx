"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, CheckCircle2, MapPinned, PencilRuler, Trash2, Edit, Search, Navigation, ListTodo, Activity, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddTaskActivity, useDeleteTaskActivity, useGetTaskById, useUpdateBusinessTask, useUpdateTaskActivity } from '@/query/business/queries';
import { toast } from 'sonner';
import { formatDateTiny } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetBusinessStaffs } from '@/query/user/queries';
import { TASK_STATUS } from '@/lib/constants';
import LoaderSpin from '@/components/shared/LoaderSpin';

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
    assigned_user_id: z.string().optional(), // Added for assigned user
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
    const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(businessData?._id);
    const [addActivityDialog, setAddActivityDialog] = useState(false);
    const [editActivityDialog, setEditActivityDialog] = useState(false);
    const [deleteActivityDialog, setDeleteActivityDialog] = useState(false);
    const [editTaskDialog, setEditTaskDialog] = useState(false);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [editingActivity, setEditingActivity] = useState<any>(null);
    const [isFromProject, setIsFromProject] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

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
            status: "Pending",
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
        console.log("task", task);
        if (task?.data?.project_id != null) setIsFromProject(true);
        if (task?.data) {
            taskForm.setValue("task_name", task?.data.task_name);
            taskForm.setValue("task_description", task?.data.task_description || "");
            taskForm.setValue("status", task?.data?.status);
            if (task.data.assigned_to && loadedStaffs && !task?.data?.is_project_task) {
                taskForm.setValue("assigned_user_id", task?.data.assigned_to || "");
                const assignedUser = loadedStaffs?.find((user: any) => user?.user_id?._id === task.data.assigned_to);
                if (assignedUser) {
                    setSelectedUser(assignedUser);
                    setSearchTerm(assignedUser.user_id.name);
                }
            }
        }
    }, [task, loadedStaffs, taskForm]);

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
            console.log("selected user: ", user.user_id._id);
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
                toast.success(res?.data?.message);
            } else {
                toast.error(res?.data?.message);
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
            status: values.status,
            is_project_task: task?.data?.is_project_task,
            assigned_to: selectedUser?.user_id?._id
        };
        console.log("editData: ",updateData);
        
        const res = await UpdateTask(updateData);
        console.log("res: ", res);
        
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
                toast.error(res?.data?.message);
            }
        }
        setDeleteActivityDialog(false);
        setSelectedActivityId(null);
        refetch();
    };

    const handleNavigateToProject = () => {
        router.replace(`/admin/projects/${task?.data?.project_id}`);
    }

    const markAsComplete = async (activity_id: string) => {
        const data = {
            activity_id: activity_id,
            is_done: true,
            is_status: true,
        };
        const res = await UpdateTaskActivity(data);
        
        if (res?.status == 200) {
            toast.success(res?.message);
        } else {
            toast.error(res?.message);
        }
        refetch();
    };

    function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

    if(isLoading){
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
        <LoaderSpin size={40} />
      </div>
    )
  }

    if (!task) {
        return <div className="p-5 text-slate-300">Task not found</div>;
    }

    return (
        <div className="p-5 overflow-y-scroll pb-20 min-h-screen">
            <Breadcrumb className='mb-3'>
                <BreadcrumbList>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Go Back</BreadcrumbLink>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="font-medium text-sm text-slate-300 flex items-center gap-1">
                        <ListTodo size={16} /> Task Details
                    </h1>
                    {!isFromProject ? (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                            onClick={handleEditTask}
                        >
                            <Edit size={12} />
                            Edit Task
                        </motion.div>
                    ): (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                            onClick={handleNavigateToProject}
                        >
                            <Navigation size={12} />
                            Go To Project
                        </motion.div>
                    )}
                </div>
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <h2 className="text-xs font-semibold text-slate-300">{task?.data?.task_name} ({task?.data?.status})</h2>
                    <p className="text-xs text-slate-400 mt-1">Description: {task?.data?.task_description || "N/A"}</p>
                    <p className="text-xs text-slate-400">Start: {formatDateTiny(task?.data?.start_date) || "N/A"}</p>
                    <p className="text-xs text-slate-400">End: {formatDateTiny(task?.data?.end_date) || "N/A"}</p>
                    
                        <p className="text-xs text-slate-400 mt-1">
                            Assigned To: {task?.data?.is_project_task ? task?.data?.assigned_team?.team_name || "Not Assigned" : task?.data?.assigned_user?.name }
                        </p>
                        {task?.data?.is_project_task ? (<p className='text-xs text-slate-400 mt-1'>Project: {task?.data?.project_details?.project_name}</p>) : ""}
                </div>

                <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
                            <Activity size={14} /> Activities
                        </h1>
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
                        {task?.data?.activities?.length > 0 ? (
                            task?.data?.activities.map((activity: any) => (
                                <div key={activity._id} className="w-full p-1">
                                    <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-slate-300">{activity.activity}</p>
                                                <p className="text-xs text-slate-400">{activity.description || "N/A"}</p>
                                                {activity?.is_done && <p className='text-xs text-slate-400'>Completed In: <span className='font-semibold'>{formatDuration(activity?.completed_in)}</span></p>}
                                            </div>
                                            <div className="flex gap-2">
                                                {activity?.is_done ? (
                                                    <motion.div
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="p-2 px-4 rounded-lg border border-slate-700 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-not-allowed opacity-50 pointer-events-none text-xs font-medium flex gap-1 items-center"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        Completed
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                                                        onClick={() => markAsComplete(activity?._id)}
                                                    >
                                                        <CheckCircle size={12} />
                                                        Mark as Completed
                                                    </motion.div>
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
            </div>

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
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Activity Name</FormLabel>
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
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Activity Name</FormLabel>
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
                                                {TASK_STATUS.map((status)=>(
                                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                                ))}
                                                
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {!isFromProject && (
                                <FormField
                                    control={taskForm.control}
                                    name="assigned_user_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Assigned User</FormLabel>
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
                                                                            selectedUser?.user_id?._id === user.user_id._id ? 'bg-slate-700' : ''
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
                        <DialogDescription>Are you sure you want to delete this activity? This action cannot be undone.</DialogDescription>
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
        </div>
    );
};

export default TaskDetailPage;