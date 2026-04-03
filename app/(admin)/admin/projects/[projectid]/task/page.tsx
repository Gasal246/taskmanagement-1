"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { EllipsisVertical, Eye, MapPinned, PencilRuler, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddBusinessTask, useGetBusinessTasks, useGetTeamsForProjects, useUpdateBusinessTask } from '@/query/business/queries';
import { toast } from 'sonner';
import { formatDateTiny } from '@/lib/utils';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Validation schema for task form
const taskSchema = z.object({
  task_name: z.string().min(2, { message: "Task name must be at least 2 characters." }),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"], { message: "Please select a valid status." }),
  team_id: z.string().optional(),
  task_description: z.string().min(5, { message: "Task description must be at least 5 characters." }).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  _id: z.string().optional(),
});

// Validation schema for activity form
const activitySchema = z.object({
  activity_name: z.string().min(2, { message: "Activity name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).optional(),
});

const TasksPage = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  //const [tasks, setTasks] = useState(mockTasks);
  const [addTaskDialog, setAddTaskDialog] = useState(false);
  const [editTaskDialog, setEditTaskDialog] = useState(false);

  const { businessData } = useSelector((state: RootState) => state.user);

  const [editingTask, setEditingTask] = useState<any>(null);
  const { data: availableTeams, isLoading: isTeamLoading } = useGetTeamsForProjects(params.projectid);
  const { mutateAsync: AddBusinessTask, isPending: isTaskAdding } = useAddBusinessTask();
  const { mutateAsync: UpdateBusinessTask, isPending: isUpading } = useUpdateBusinessTask();
  const { data: tasks, isLoading, refetch } = useGetBusinessTasks(params.projectid);

  // Task form
  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_name: "",
      status: "To Do",
      team_id: "",
      task_description: "",
      start_date: "",
      end_date: "",
    },
  });

  const handleAddTask = () => {
    taskForm.reset();
    setAddTaskDialog(true);
  };

  useEffect(() => {
    console.log("availableTeams: ", availableTeams);
    
  }, [availableTeams]);

  useEffect(() => {
    console.log("tasks", tasks);

  }, [tasks]);

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    console.log("editing task", task);

    taskForm.setValue("task_name", task?.task_name);
    taskForm.setValue("status", task?.status);
    taskForm.setValue("team_id", task?.assigned_teams?._id || "");
    taskForm.setValue("task_description", task?.task_description || "");
    taskForm.setValue("start_date", task?.start_date?.split("T")[0] || "");
    taskForm.setValue("end_date", task?.end_date?.split("T")[0] || "");
    setEditTaskDialog(true);
  };

  const onTaskSubmit = async (values: z.infer<typeof taskSchema>) => {
    console.log("Task data:", values);
    if (addTaskDialog) {
      const newTask = {
        project_id: params.projectid,
        assigned_to: values.team_id,
        task_name: values.task_name,
        task_description: values.task_description,
        start_date: values.start_date,
        end_date: values.end_date,
        status: values.status.trim(),
        business_id: businessData?._id,
        is_project_task: true
      };

      const res: any = await AddBusinessTask(newTask);
      if (res?.status == 201) {
        toast.success(res?.data?.message);
      } else {
        toast.error(res?.data?.message)
      }
    } else if (editTaskDialog) {
      const taskToEdit = {
        task_id: editingTask?._id,
        task_name: values.task_name,
        task_description: values.task_description,
        start_date: values.start_date,
        end_date: values.end_date,
        status: values.status,
        assigned_to: values.team_id,
        is_project_task: true
      }
      const res = await UpdateBusinessTask(taskToEdit);
      if (res?.status == 200) {
        toast.success(res?.data?.message);
      } else {
        toast.error(res?.data?.message);
      }
    }

    setAddTaskDialog(false);
    setEditTaskDialog(false);
    setEditingTask(null);
    refetch();
  };

  const handleNavigateToTask = (taskid: string) => {
     router.replace(`/admin/tasks/${taskid}`);
  }

  if (isLoading) {
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
        <LoaderSpin size={40} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 overflow-y-scroll pb-20 min-h-screen">
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
            <BreadcrumbPage>Tasks</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <MapPinned size={14} /> Tasks
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center w-full sm:w-auto"
            onClick={handleAddTask}
          >
            <PencilRuler size={12} />
            Add Task
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {tasks?.data?.map((task: any) => (
            <div className="w-full p-1 md:w-1/2 xl:w-1/4" key={task._id}>
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1 pr-2">
                    {task.task_name} ({task.status})
                  </h1>
                  {/* <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
                    onClick={() => handleEditTask(task)}
                  >
                    <PencilRuler size={16} />
                  </motion.div> */}

                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.98 }}
                        className='hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                      >
                        <EllipsisVertical size={14} />
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                      <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                        <div className='w-full p-0.5 space-y-1'>
                          <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleNavigateToTask(task?._id)}
                            className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                            <Eye size={14} />
                            <h1 className='text-xs font-semibold'>View</h1>
                          </motion.div>

                          <motion.div onClick={() => handleEditTask(task)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                            <PencilRuler size={14} />
                            <h1 className='text-xs font-semibold'>Edit</h1>
                          </motion.div>

                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-slate-400">Description: {task.task_description || "N/A"}</p>
                  <p className="text-xs text-slate-400">Start: {formatDateTiny(task.start_date) || "N/A"}</p>
                  <p className="text-xs text-slate-400">End: {formatDateTiny(task.end_date) || "N/A"}</p>
                  <p className="text-xs text-slate-400 mt-2">Team:</p>
                  <p className="text-xs text-slate-300 ml-2">
                    {task.assigned_teams ? task?.assigned_teams?.team_name : "Not Assigned"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addTaskDialog} onOpenChange={setAddTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Add a new task to the project.</DialogDescription>
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
                    <FormLabel className="text-xs text-slate-300 font-semibold">Task Description</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Task description" {...field} />
                    </FormControl>
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
                      <Input type="date" placeholder="Start date" {...field} />
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
                      <Input type="date" placeholder="End date" {...field} />
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
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <select {...field} className="w-full p-2 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-600">
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Assigned Team</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <select {...field} className="w-full p-2 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-600">
                        <option value="">No team</option>
                        {availableTeams?.data?.map((team:any) => (
                          <option key={team?._id} value={team?._id}>
                            {team?.team_name}
                          </option>
                        ))}
                      </select>
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
                >
                  Add Task
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
                    <FormLabel className="text-xs text-slate-300 font-semibold">Task Description</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Task description" {...field} />
                    </FormControl>
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
                      <Input type="date" placeholder="Start date" {...field} />
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
                      <Input type="date" placeholder="End date" {...field} />
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
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <select {...field} className="w-full p-2 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-600">
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Assigned Team</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <select {...field} className="w-full p-2 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-600">
                        <option value="" >No team</option>
                        {availableTeams?.data?.map((team:any) => (
                          <option key={team?._id} value={team?._id}>
                            {team?.team_name}
                          </option>
                        ))}
                      </select>
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
                >
                  Update Task
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
