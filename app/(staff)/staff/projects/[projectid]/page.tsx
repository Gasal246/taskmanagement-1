"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Building, CheckCircle, EllipsisVertical, Eye, Files, ListTodo, Package, PanelsTopLeft, PencilRuler, Plus, Users, Workflow } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApproveProject, useGetProjectsbyIdForStaffs, useUpdateProject } from '@/query/business/queries';
import { toast, Toaster } from 'sonner';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import Cookies from "js-cookie";

const formSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional()
});

// Fake project data
const projectData = {
  name: "Website Redesign",
  description: "Redesign of the company website to improve user experience and modernize the design.",
  manager: {
    name: "John Doe",
    email: "john.doe@example.com",
    avatar_url: "/john-doe.png",
  },
  status: 1, // 1: Active, 2: On Hold, 3: Completed
  startDate: "2025-01-15",
  endDate: "2025-06-30",
  budget: "$50,000",
  team: [
    { _id: "1", name: "Alice Smith", role: "Frontend Developer" },
    { _id: "2", name: "Bob Johnson", role: "Backend Developer" },
    { _id: "3", name: "Carol White", role: "UI/UX Designer" },
  ],
  tasks: [
    { _id: "1", task_name: "Create wireframes", status: "Completed" },
    { _id: "2", task_name: "Develop homepage", status: "In Progress" },
    { _id: "3", task_name: "API integration", status: "To Do" },
  ],
  logs: [
    { _id: "1", action: "Project Created", user: "John Doe", timestamp: "2025-01-10 10:00 AM" },
    { _id: "2", action: "Wireframes Approved", user: "Carol White", timestamp: "2025-02-01 02:30 PM" },
    { _id: "3", action: "Homepage Development Started", user: "Alice Smith", timestamp: "2025-03-15 09:15 AM" },
  ],
  documents: [
    { _id: "1", doc_name: "Project Proposal.pdf" },
    { _id: "2", doc_name: "Design Mockups.fig" },
    { _id: "3", doc_name: "API Documentation.docx" },
  ],
};

const formatDateTiny = (date: any) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ProjectsPage = () => {
  const router = useRouter();
  const [updateProjectDialog, setUpdateProjectDialog] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [docs, setDocs] = React.useState<any[]>([]);
  const [openDocDialog, setOpenDocDialog] = React.useState(false);
  const [docFile, setDocFile] = React.useState<File | null>(null);
  const [docName, setDocName] = React.useState<string>('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [docExpiry, setDocExpiry] = React.useState<string>('');
  const [isHead, setIsHead] = useState(false);
  const params = useParams<{ projectid: string }>();

  const { data: project, isLoading, refetch } = useGetProjectsbyIdForStaffs(params.projectid);
  const { mutateAsync: ApproveProject, isPending: isApproving } = useApproveProject();
  const { mutateAsync: UpdateProject, isPending: UpdatingProject } = useUpdateProject();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "approved",
      priority: "low",
      type: "R&D"
    },
  });

  useEffect(()=> {
    fetchCookies();
  },[]);

  useEffect(() => {
    if (project) {
      console.log("Fetched project data:", project);
      calculateProgress();
    }
  }, [project]);

  const calculateProgress = () => {
    const totalTasks = project?.data?.tasks?.length ?? 0;
    const completedTasks = project?.data?.tasks?.filter((tsk: any) => tsk.status == "Completed")?.length ?? 0;
    const progressPerc = Math.round((completedTasks / totalTasks) * 100);
    setProgress(progressPerc);
  };

  const handleClickEdit = () => {
    form.setValue("name", project?.data?.project_name);
    form.setValue("description", project?.data?.project_description);
    form.setValue("startDate", project?.data?.start_date?.split("T")[0]);
    form.setValue("endDate", project?.data?.end_date?.split("T")[0]);
    form.setValue("status", project?.data?.status);
    form.setValue("priority", project?.data?.priority);
    form.setValue("type", project?.data?.type);
    setUpdateProjectDialog(true);
  };

  const fetchCookies = () => {
    const cookieData = Cookies.get("user_domain");
    const roleCookie = Cookies.get("user_role");

    if(!cookieData || !roleCookie) return toast.error("Cookie not available");

    const domainJson = JSON.parse(cookieData);
    const roleJson = JSON.parse(roleCookie);

    setIsHead(roleJson.role_name.endsWith("HEAD"));
  }

  const handleNavigateToChangeDetails = () => {
     router.push(`/staff/projects/${params.projectid}/task`);
  };

  const handleNavigateToTeams = () => {
     router.push(`/staff/projects/${params.projectid}/teams`);
  };

  const handleNavigateToFlows = () => {
    // router.push(`/admin/projects/${params.projectid}/flows`);
  };

  const handleNavigateToDepts = () => {
    router.push(`/staff/projects/${params.projectid}/depts`);
    
    
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const updateProject = {
      project_id: params.projectid,
      project_name: values.name,
      project_description: values.description,
      status: values.status,
      start_date: values.startDate,
      end_date: values.endDate,
      priority: values.priority,
      type: values.type
    };
    const res = await UpdateProject(updateProject);
    if (res?.status == 200) {
      toast.success(res?.data?.message);
    } else {
      toast.error(res?.data?.message);
    }
    refetch();
    setUpdateProjectDialog(false);
  };

  const handleAddDocument = async () => {
    console.log("document upload", docFile, docName, docExpiry);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (isLoading) {
    return (
      <div className='p-4 sm:p-5 overflow-y-auto min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50'>
        <LoaderSpin size={32} />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-5 overflow-y-auto min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50'>
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()} className='text-xs sm:text-sm'>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className='text-xs sm:text-sm'>Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className='font-medium text-xs sm:text-sm text-slate-200 flex items-center gap-1'>
            <PanelsTopLeft strokeWidth={2} size={14} /> Project Details
          </h1>
          {project?.data?.canEdit && (
            <div className='flex flex-col sm:flex-row justify-end items-start sm:items-center gap-2 sm:gap-3'>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='p-2 px-3 sm:px-4 group rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto'
                onClick={handleClickEdit}
              >
                <PencilRuler className='group-hover:text-pink-300' size={12} />
                Edit Info
              </motion.div>
            </div>
          )}
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Project Name</p>
            <p className='text-xs sm:text-sm text-slate-300 font-semibold'>{project?.data?.project_name || "-"}</p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Description</p>
            <p className='text-xs sm:text-sm text-slate-300 font-semibold'>{project?.data?.project_description || "-"}</p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Progress</p>
            <p className='text-xs sm:text-sm text-slate-300 font-semibold'>{progress || "0"}%</p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Start Date</p>
            <p className='text-xs sm:text-sm text-slate-300 font-semibold'>{formatDateTiny(project?.data?.start_date) || "-"}</p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>End Date</p>
            <p className='text-xs sm:text-sm text-slate-300 font-semibold'>{formatDateTiny(project?.data?.end_date) || "-"}</p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Approval</p>
            <p className={`text-xs sm:text-sm font-semibold ${project?.data?.is_approved ? 'text-green-600' : 'text-red-600'}`}>
              {project?.data?.is_approved ? "Approved" : "Not Approved"}
            </p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Status</p>
            <p className={`text-xs sm:text-sm font-semibold capitalize ${project?.data?.status == "Pending" ? 'text-gray-600' : project?.data.status == "completed" ? 'text-green-600' : project?.data?.status == "approved" ? 'text-blue-600' : project?.data?.status == "cancelled" ? 'text-red-600' : 'text-gray-600'}`}>
              {project?.data?.status}
            </p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Project Type</p>
            <p className={`text-xs sm:text-sm font-semibold capitalize text-slate-300`}>
              {project?.data?.type}
            </p>
          </div>
          <div className="mb-2">
            <p className='text-xs text-slate-400'>Project Priority</p>
            <p className={`text-xs sm:text-sm font-semibold capitalize ${project?.data?.priority == "high" ? 'text-red-600' : 'text-slate-300'}`}>
              {project?.data?.priority}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <Building size={14} /> Project Departments
          </h1>
          {isHead && (
            <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!project?.data?.is_approved}
            className={`p-2 px-3 sm:px-4 rounded-lg border text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto transition-all
      ${
        project?.data?.is_approved
          ? 'border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-white'
          : 'border-slate-700 bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
      }`}
            onClick={handleNavigateToDepts}
          >
            <PencilRuler size={12} />
            Edit Departments
          </motion.button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {project?.data?.departments?.map((dept: any) => (
            <div key={dept?._id} className="p-1">
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-cyan-800 flex items-center justify-between">
                <span className="font-medium text-xs sm:text-sm text-slate-300">{dept?.department_name}</span>
                {dept?.is_active && <CheckCircle size={14} className="text-cyan-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <Users size={14} /> Teams
          </h1>
          {isHead && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!project?.data?.is_approved}
              className='p-2 px-3 sm:px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto'
              onClick={handleNavigateToTeams}
            >
              <PencilRuler size={12} />
              Edit Teams
            </motion.button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {project?.data?.teams?.map((member: any) => (
            <div key={member?._id} className="p-1">
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">{member?.team_name}</h1>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <ListTodo size={14} /> Tasks
          </h1>
          {isHead && (
            <motion.button
              disabled={!project?.data?.is_approved}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='p-2 px-3 sm:px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto'
              onClick={handleNavigateToChangeDetails}
            >
              <PencilRuler size={12} />
              Changes
            </motion.button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {project?.data?.tasks?.map((task: any) => (
            <div key={task?._id} className="p-1">
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">{task?.task_name} ({task?.status})</h1>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <Workflow size={14} /> Project Flow (Logs)
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-3 sm:px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto'
            onClick={handleNavigateToFlows}
          >
            <PencilRuler size={12} />
            View All
          </motion.div>
        </div>
        <div className="flex flex-col gap-2">
          {project?.data?.flows?.map((log: any) => (
            <div key={log?._id} className="p-1">
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">{log?.Log}</h1>
                <p className="text-xs text-slate-400">{formatDateTiny(log?.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg min-h-[15vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <Files size={14} /> Project Documents
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-3 sm:px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs sm:text-sm font-medium flex gap-1 items-center w-full sm:w-auto'
            onClick={() => setOpenDocDialog(true)}
          >
            <Plus size={12} />
            Add Document
          </motion.div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {projectData?.documents?.map((doc) => (
            <div key={doc?._id} className="p-1">
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
                  <Package size={14} /> {doc?.doc_name}
                </h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className='p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center absolute top-1 right-2'
                    >
                      <EllipsisVertical size={16} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <div className='w-full p-0.5 space-y-1'>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                        >
                          <Eye size={12} />
                          <h1 className='text-xs font-medium'>View</h1>
                        </motion.div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={updateProjectDialog} onOpenChange={setUpdateProjectDialog}>
        <DialogContent className="sm:max-w-[425px] w-[90vw]">
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base'>Update Project</DialogTitle>
            <DialogDescription className='text-xs sm:text-sm'>Updating project details.</DialogDescription>
          </DialogHeader>
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Project Name</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="Project name" {...field} className='text-xs sm:text-sm' />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Description</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="Project description" {...field} className='text-xs sm:text-sm' />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Start Date</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="Start date" type="date" {...field} className='text-xs sm:text-sm' />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">End Date</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="End date" type="date" {...field} className='text-xs sm:text-sm' />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Type</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          {DEPARTMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Status</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-slate-300 font-semibold">Priority</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-xs sm:text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
                <div className="w-full flex items-center justify-end">
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-xs sm:text-sm font-semibold'
                  >
                    {UpdatingProject ? 'Updating...' : 'Update Data'}
                  </motion.button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDocDialog} onOpenChange={setOpenDocDialog}>
        <DialogContent className="w-[90vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base'>Add Document</DialogTitle>
            <DialogDescription className='text-xs sm:text-sm'>You will be notified before the documents are expired.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className='text-xs sm:text-sm'>Document Name</Label>
              <Input
                placeholder="Enter document name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className='text-xs sm:text-sm'
              />
            </div>
            <div>
              <Label className='text-xs sm:text-sm'>Expiry Date</Label>
              <Input
                type="date"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
                className='text-xs sm:text-sm'
              />
            </div>
            <div>
              <Label className='text-xs sm:text-sm'>Upload File</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className='text-xs sm:text-sm' />
            </div>
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Preview"
                width={150}
                height={150}
                className="w-full rounded-md border border-slate-700 h-[120px] sm:h-[180px] object-contain aspect-square"
              />
            )}
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleAddDocument}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-2 sm:p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-1 flex items-center gap-1 justify-center"
            >
              <Plus size={14} />
              <span className="font-semibold text-xs sm:text-sm text-slate-300">Upload Document</span>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;