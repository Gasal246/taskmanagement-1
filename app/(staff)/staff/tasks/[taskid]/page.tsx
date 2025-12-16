"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, Edit, Trash2, PlusCircle, CheckCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useGetTaskById, useAddTaskActivity, useUpdateTaskActivity, useDeleteTaskActivity, useUpdateBusinessTask } from '@/query/business/queries';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Cookies from "js-cookie";
import { getSession } from 'next-auth/react';

// Define interfaces for Task and Activity
interface Activity {
  id: string;
  activity_name: string;
  activity_description: string;
  isCompleted: boolean;
  completed_in: string | null;
}

interface Task {
  id: string;
  task_name: string;
  task_description: string;
  is_project_task: boolean;
  assigned_to?: string;
  assigned_teams?: string[];
  project_name?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'completed';
  activities: Activity[];
}

// Validation schema for activity form
const activitySchema = z.object({
  activity_name: z.string().min(2, { message: "Activity name must be at least 2 characters." }),
  activity_description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  id: z.string().optional(),
});

// Validation schema for task form
const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  task_description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
  assigned_to: z.string().optional(),
  assigned_teams: z.array(z.string()).optional(),
  start_date: z.string().min(1, { message: "Start date is required." }),
  end_date: z.string().min(1, { message: "End date is required." }),
});

const TaskDetails = () => {
  const router = useRouter();
  const params = useParams<{ taskid: string }>();
  const [canEdit, setCanEdit] = useState(false);
  const { data: task, isLoading, refetch } = useGetTaskById(params.taskid);
  const { mutateAsync: AddTaskActivity, isPending: isAddingActivity } = useAddTaskActivity();
  const { mutateAsync: UpdateTaskActivity, isPending: isUpdatingActivity } = useUpdateTaskActivity();
  const { mutateAsync: DeleteTaskActivity, isPending: isDeletingActivity } = useDeleteTaskActivity();
  const { mutateAsync: UpdateTask, isPending: isUpdatingTask } = useUpdateBusinessTask();
  const [addActivityDialog, setAddActivityDialog] = useState(false);
  const [editActivityDialog, setEditActivityDialog] = useState<any>(false);
  const [deleteActivityDialog, setDeleteActivityDialog] = useState(false);
  const [editTaskDialog, setEditTaskDialog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  // Activity form
  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_name: "",
      activity_description: "",
    },
  });

  const setAuthority = async() => {
    const session:any = await getSession();
    console.log("session: ", session);
    
    const roleCookie = Cookies.get("user_role");
    if(!roleCookie) return toast.error("No Cookies found");

    const roleJson = JSON.parse(roleCookie);
    setCanEdit(task?.data?.creator == session?.user?.id || roleJson?.role_name.endsWith("HEAD"));
  }

  useEffect(() => {
    console.log("task: ", task);
    setAuthority();
  }, [task]);

  // Task form
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      status: "To Do",
      start_date: "",
      end_date: "",
    },
  });

  useEffect(() => {
    if (task?.data) {
      taskForm.setValue("task_name", task?.data?.task_name);
      taskForm.setValue("task_description", task?.data?.task_description || "");
      taskForm.setValue("status", task?.data?.status);
      taskForm.setValue("start_date", task?.data?.start_date);
      taskForm.setValue("end_date", task?.data?.end_date);
    }
  }, [task, taskForm]);

  const handleAddActivity = () => {
    activityForm.reset();
    setAddActivityDialog(true);
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    activityForm.setValue("activity_name", activity.activity);
    activityForm.setValue("activity_description", activity.description || "");
    setEditActivityDialog(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    setSelectedActivityId(activityId);
    setDeleteActivityDialog(true);
  };

  const handleEditTask = () => {
    setEditTaskDialog(true);
  };

  const onActivitySubmit = async (values: z.infer<typeof activitySchema>) => {
    if (addActivityDialog) {
      const newActivity = {
        task_id: params.taskid,
        activity: values.activity_name,
        description: values.activity_description,
      };

      const res = await AddTaskActivity(newActivity);
      if (res?.status === 201) {
        toast.success(res?.data.message || "Activity added successfully");
      } else {
        toast.error(res?.data.message || "Failed to add activity");
      }
    } else if (editActivityDialog && editingActivity) {
      const editData = {
        activity_id: editingActivity._id,
        activity: values.activity_name,
        description: values.activity_description,
        isCompleted: editingActivity.is_done,
      };
      
      const res = await UpdateTaskActivity(editData);
      if (res?.status === 200) {
        toast.success(res?.data?.message || "Activity updated successfully");
      } else {
        toast.error(res?.data?.message || "Failed to update activity");
      }
    }
    setAddActivityDialog(false);
    setEditActivityDialog(false);
    setEditingActivity(null);
    refetch();
  };

  const handleNavigateToProject = () => {
    router.push(`/staff/projects/${task?.data?.project_details?._id}`);
  }

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
    const updateData = {
      task_id: params.taskid,
      task_name: values.task_name,
      task_description: values.task_description,
      status: values.status,
      is_project_task: task?.data?.is_project_task,
      assigned_to: values.assigned_to,
      assigned_teams: values.assigned_teams,
      start_date: values.start_date,
      end_date: values.end_date,
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
        toast.success(res?.data?.message || "Activity deleted successfully");
      } else {
        toast.error(res?.data?.message || "Failed to delete activity");
      }
    }
    setDeleteActivityDialog(false);
    setSelectedActivityId(null);
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

  const markAsComplete = async(activity_id: string) => {
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
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-20 min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return <div className="p-4 text-slate-300">Task not found</div>;
  }

  return (
    <div className="p-4 pb-20 min-h-screen">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-slate-100"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="font-semibold text-sm text-slate-300">Task Details</h1>
        </div>
        {task?.data?.is_project_task ? (
          <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                                      onClick={handleNavigateToProject}
                                  >
                                      <Navigation size={12} />
                                      Go To Project
                                  </motion.div>
        ) : (
          canEdit && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
          onClick={handleEditTask}
        >
          <Edit size={12} />
          Edit Task
        </motion.div>
        )
        )}
      </div>

      {/* Task Details Card */}
      <Card className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-4 rounded-lg border-none mb-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-2">{task?.data?.task_name}</h2>
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-400">Description</h3>
            <p className="text-sm text-slate-200">{task?.data?.task_description}</p>
          </div>
          {task?.data?.is_project_task ? (
            <>
              <div>
                <h3 className="text-xs font-semibold text-slate-400">Project</h3>
                <p className="text-sm text-slate-200">{task?.data?.project_details?.project_name}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-400">Assigned Team</h3>
                {/* <div className="flex flex-wrap gap-2">
                  {task?.data?.assigned_team?.map((team) => (
                    <Badge key={team} className="bg-blue-600 text-white text-xs">
                      {team}
                    </Badge>
                  ))}
                </div> */}
                <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-600 text-white text-xs">
                      {task?.data?.assigned_team?.team_name}
                    </Badge>
                </div>
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-xs font-semibold text-slate-400">Assigned To</h3>
              <p className="text-sm text-slate-200">{task?.data?.assigned_to || 'Unassigned'}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:gap-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-400">Start Date</h3>
              <p className="text-sm text-slate-200">{new Date(task?.data?.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400">End Date</h3>
              <p className="text-sm text-slate-200">{new Date(task?.data?.end_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400">Status</h3>
            <div className="flex items-center gap-2">
              {task?.data?.status === 'Completed' ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-yellow-500" />
              )}
              <span
                className={`text-xs ${task?.data?.status === 'Completed' ? 'text-green-500' : 'text-yellow-500'}`}
              >
                {task?.data?.status.charAt(0).toUpperCase() + task?.data?.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Activities Section */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2 flex justify-between items-center">
        <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <CheckCircle2 size={16} /> Activities
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
      <div className="space-y-3">
        {task?.data?.activities?.length > 0 ? (
          task?.data?.activities?.map((activity: any) => (
            <Card
              key={activity._id}
              className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-4 rounded-lg border-none hover:bg-slate-900/70 transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-200">{activity?.activity}</h3>
                  <p className="text-xs text-slate-400 mt-1">{activity?.description}</p>
                  {activity?.isCompleted && activity.completed_in && (
                    <p className="text-xs text-slate-400 mt-1">
                      Completed In: {formatDuration(parseInt(activity.completed_in))}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activity?.is_done ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-yellow-500" />
                  )}
                  <span
                    className={`text-xs ${activity?.is_done ? 'text-green-500' : 'text-yellow-500'}`}
                  >
                    {activity?.is_done ? 'Completed' : 'Pending'}
                  </span>
                  {activity?.is_done ? "" : (<motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                    onClick={() => markAsComplete(activity?._id)}
                  >
                    <CheckCircle size={12} />
                    Mark as Completed
                  </motion.div>)}
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-1 rounded-full hover:bg-slate-800 cursor-pointer flex items-center"
                    onClick={() => handleEditActivity(activity)}
                  >
                    <Edit size={14} />
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
            </Card>
          ))
        ) : (
          <div className="text-center text-sm text-slate-400">No activities found for this task.</div>
        )}
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
                name="activity_description"
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
                name="activity_description"
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
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
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

export default TaskDetails;