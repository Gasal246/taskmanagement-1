"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Building, Check, CheckCircle, EllipsisVertical, Eye, Files, FileText, Loader2, PanelsTopLeft, PencilRuler, Square, Trash2, Upload, Users, Workflow, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApproveProject, useGetProjectById, useUpdateProject, useAddProjectDoc, useRemoveProjectDoc, useDeleteProject, useGetBusinessRegions, useGetAreasandDeptsForRegion, useGetTeamsForProjects, useAddProjectHead, useRemoveProjectHead, useAddProjectSupervisor, useRemoveProjectSupervisor } from '@/query/business/queries';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import LoaderSpin from '@/components/shared/LoaderSpin';
import MarkdownPreview from '@/components/shared/MarkdownPreview';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase/config';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar } from 'antd';
import { useGetBusinessStaffs } from '@/query/user/queries';

// Validation schema for project update form
const formSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  region_id: z.string().min(1, { message: "Region is required." }),
  area_id: z.string().nullable().optional()
});

const formatDateTiny = (date: any) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ProjectView = () => {
  const router = useRouter();
  const [updateProjectDialog, setUpdateProjectDialog] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [projectDocs, setProjectDocs] = React.useState<any[]>([]);
  const [docFile, setDocFile] = React.useState<File | null>(null);
  const [docName, setDocName] = React.useState<string>('');
  const [docPreview, setDocPreview] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<string>('');
  const [docAccess, setDocAccess] = React.useState<'public' | 'private'>('public');
  const [selectedPeople, setSelectedPeople] = React.useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [docToDelete, setDocToDelete] = React.useState<any | null>(null);
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = React.useState(false);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = React.useState(false);
  const [businessRegions, setBusinessRegions] = React.useState<any[]>([]);
  const [regionAreas, setRegionAreas] = React.useState<any[]>([]);
  const [projectHeadDialogOpen, setProjectHeadDialogOpen] = useState(false);
  const [projectHeadSearch, setProjectHeadSearch] = useState("");
  const [selectedProjectHeadId, setSelectedProjectHeadId] = useState("");
  const [projectSupervisorDialogOpen, setProjectSupervisorDialogOpen] = useState(false);
  const [projectSupervisorSearch, setProjectSupervisorSearch] = useState("");
  const [selectedProjectSupervisorId, setSelectedProjectSupervisorId] = useState("");
  const params = useParams<{ projectid: string }>();
  const { data: session }:any = useSession();

  const { data: project, isLoading, refetch } = useGetProjectById(params.projectid);
  const { data: teamsData, isLoading: loadingTeams } = useGetTeamsForProjects(params.projectid);
  const { mutateAsync: ApproveProject, isPending: isApproving } = useApproveProject();
  const { mutateAsync: UpdateProject, isPending: UpdatingProject } = useUpdateProject();
  const { mutateAsync: addProjectHead, isPending: addingProjectHead } = useAddProjectHead();
  const { mutateAsync: removeProjectHead, isPending: removingProjectHead } = useRemoveProjectHead();
  const { mutateAsync: addProjectSupervisor, isPending: addingProjectSupervisor } = useAddProjectSupervisor();
  const { mutateAsync: removeProjectSupervisor, isPending: removingProjectSupervisor } = useRemoveProjectSupervisor();
  const { mutateAsync: addProjectDoc } = useAddProjectDoc();
  const { mutateAsync: removeProjectDoc } = useRemoveProjectDoc();
  const { mutateAsync: deleteProject, isPending: deletingProject } = useDeleteProject();
  const { mutateAsync: getRegions } = useGetBusinessRegions();
  const { mutateAsync: getAreasForRegion, isPending: loadingAreas } = useGetAreasandDeptsForRegion();
  const businessId = project?.data?.business_id?.toString?.() ?? project?.data?.business_id ?? "";
  const { data: businessStaffs, isLoading: loadingBusinessStaffs } = useGetBusinessStaffs(businessId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "approved",
      priority: "low",
      type: "R&D",
      region_id: "",
      area_id: ""
    },
  });

  const selectedRegionId = form.watch("region_id");

  useEffect(() => {
    if (project) {
      console.log("Fetched project data:", project);
      calculateProgress();
      setProjectDocs(project?.data?.docs || []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => {
    const businessId = project?.data?.business_id?.toString?.() ?? project?.data?.business_id;
    if (!businessId) return;
    const fetchRegions = async () => {
      const res = await getRegions({ business_id: businessId });
      if (res?.status === 200) {
        setBusinessRegions(res?.data ?? []);
      } else {
        setBusinessRegions([]);
      }
    };
    fetchRegions();
  }, [project?.data?.business_id, getRegions]);

  useEffect(() => {
    const fetchAreas = async () => {
      if (!selectedRegionId) {
        form.setValue("area_id", "");
        setRegionAreas([]);
        return;
      }
      const res = await getAreasForRegion(selectedRegionId);
      const areas = res?.status === 200 ? res?.data?.areas ?? [] : [];
      setRegionAreas(areas);
      const currentAreaId = form.getValues("area_id");
      if (!areas.some((area: any) => area?._id === currentAreaId)) {
        form.setValue("area_id", "");
      }
    };

    fetchAreas();
  }, [selectedRegionId, getAreasForRegion, form]);

  const teams = useMemo(() => teamsData?.data ?? [], [teamsData?.data]);
  const projectHeads = useMemo(() => {
    const heads = project?.data?.project_heads ?? [];
    const seenHeadIds = new Set<string>();

    return heads.filter((head: any) => {
      const headId = head?._id?.toString?.() ?? head?._id;
      if (!headId || seenHeadIds.has(headId)) return false;
      seenHeadIds.add(headId);
      return true;
    });
  }, [project?.data?.project_heads]);
  const projectSupervisors = useMemo(() => project?.data?.project_supervisors ?? [], [project?.data?.project_supervisors]);

  const projectTeamPeople = useMemo(() => {
    const peopleMap = new Map<string, any>();

    teams.forEach((team: any) => {
      const teamName = team?.team_name;
      const head = team?.team_head;
      if (head?._id) {
        const headId = head._id.toString();
        const existing = peopleMap.get(headId) || {
          _id: headId,
          name: head?.name || "User",
          email: head?.email || "",
          avatar_url: head?.avatar_url || "",
          roles: [],
          teams: []
        };
        existing.roles.push("Team Lead");
        if (teamName) existing.teams.push(teamName);
        peopleMap.set(headId, existing);
      }

      (team?.members || []).forEach((member: any) => {
        const user = member?.user_id;
        if (!user?._id) return;
        const memberId = user._id.toString();
        const existing = peopleMap.get(memberId) || {
          _id: memberId,
          name: user?.name || "User",
          email: user?.email || "",
          avatar_url: user?.avatar_url || "",
          roles: [],
          teams: []
        };
        existing.roles.push("Team Member");
        if (teamName) existing.teams.push(teamName);
        peopleMap.set(memberId, existing);
      });
    });

    return Array.from(peopleMap.values()).map((person) => ({
      ...person,
      roles: Array.from(new Set(person.roles)),
      teams: Array.from(new Set(person.teams)),
    }));
  }, [teams]);

  const filteredProjectHeadStaffs = useMemo(() => {
    const searchTerm = projectHeadSearch.trim().toLowerCase();
    const existingIds = new Set(
      projectHeads
        .map((head: any) => head?._id?.toString?.() ?? head?._id)
        .filter(Boolean)
    );
    return (businessStaffs ?? []).filter((staff: any) => {
      const userId = staff?.user_id?._id?.toString?.() ?? staff?.user_id?._id;
      if (!userId || existingIds.has(userId)) return false;
      const name = staff?.user_id?.name || "";
      const email = staff?.user_id?.email || "";
      return `${name} ${email}`.toLowerCase().includes(searchTerm);
    });
  }, [businessStaffs, projectHeadSearch, projectHeads]);

  const filteredProjectSupervisorStaffs = useMemo(() => {
    const searchTerm = projectSupervisorSearch.trim().toLowerCase();
    const existingIds = new Set(
      projectSupervisors
        .map((user: any) => user?._id?.toString?.() ?? user?._id)
        .filter(Boolean)
    );
    return (businessStaffs ?? []).filter((staff: any) => {
      const userId = staff?.user_id?._id?.toString?.() ?? staff?.user_id?._id;
      if (!userId || existingIds.has(userId)) return false;
      const name = staff?.user_id?.name || "";
      const email = staff?.user_id?.email || "";
      return `${name} ${email}`.toLowerCase().includes(searchTerm);
    });
  }, [businessStaffs, projectSupervisorSearch, projectSupervisors]);

  useEffect(() => {
    if (docAccess === 'public') {
      setSelectedPeople([]);
    }
  }, [docAccess]);

  const markAsApproved = async () => {
    const res = await ApproveProject(params.projectid);
    if (res?.status == 200) {
      toast.success(res?.data?.message);
    } else {
      toast.error(res?.data?.message);
    }
    refetch();
  }

  const calculateProgress = () => {
    const totalTasks = project?.data?.tasks?.length ?? 0;
    const completedTasks = project?.data?.tasks?.filter((tsk: any) => tsk.status == "Completed")?.length ?? 0;
    const progressPerc = Math.round((completedTasks / totalTasks) * 100);
    setProgress(progressPerc);
  }

  const handleClickEdit = () => {
    form.setValue("name", project?.data?.project_name);
    form.setValue("description", project?.data?.project_description);
    form.setValue("startDate", project?.data?.start_date?.split("T")[0]);
    form.setValue("endDate", project?.data?.end_date?.split("T")[0]);
    form.setValue("status", project?.data?.status);
    form.setValue("priority", project?.data?.priority);
    form.setValue("type", project?.data?.type);
    const regionValue = project?.data?.region?._id ?? project?.data?.region_id ?? "";
    const areaValue = project?.data?.area?._id ?? project?.data?.area_id ?? "";
    form.setValue("region_id", regionValue?.toString?.() ?? regionValue ?? "");
    form.setValue("area_id", areaValue?.toString?.() ?? areaValue ?? "");
    setUpdateProjectDialog(true);
  };

  const handleNavigateToTeams = () => {
    router.push(`/admin/projects/${params.projectid}/teams`);
  }

  const handleNavigateToFlows = () => {
    router.push(`/admin/projects/${params.projectid}/flows`);
  }

  const handleNavigateToDepts = () => {
    router.push(`/admin/projects/${params.projectid}/depts`);
  }

  const handleOpenProjectHeadDialog = () => {
    setSelectedProjectHeadId("");
    setProjectHeadSearch("");
    setProjectHeadDialogOpen(true);
  };

  const handleAddProjectHead = async () => {
    if (!selectedProjectHeadId) {
      return toast.error("User not selected.");
    }
    const res = await addProjectHead({
      project_id: params.projectid,
      user_id: selectedProjectHeadId,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Project head added.");
      setProjectHeadDialogOpen(false);
      setSelectedProjectHeadId("");
      await refetch();
      return;
    }
    toast.error(res?.message || "Failed to add project head.");
  };

  const handleRemoveProjectHead = async (userId: string) => {
    const res = await removeProjectHead({
      project_id: params.projectid,
      user_id: userId,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Project head removed.");
      await refetch();
      return;
    }
    toast.error(res?.message || "Failed to remove project head.");
  };

  const handleOpenProjectSupervisorDialog = () => {
    setSelectedProjectSupervisorId("");
    setProjectSupervisorSearch("");
    setProjectSupervisorDialogOpen(true);
  };

  const handleAddProjectSupervisor = async () => {
    if (!selectedProjectSupervisorId) {
      return toast.error("User not selected.");
    }
    const res = await addProjectSupervisor({
      project_id: params.projectid,
      user_id: selectedProjectSupervisorId,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Project supervisor added.");
      setProjectSupervisorDialogOpen(false);
      setSelectedProjectSupervisorId("");
      await refetch();
      return;
    }
    toast.error(res?.message || "Failed to add project supervisor.");
  };

  const handleRemoveProjectSupervisor = async (userId: string) => {
    const res = await removeProjectSupervisor({
      project_id: params.projectid,
      user_id: userId,
    });
    if (res?.status === 200) {
      toast.success(res?.message || "Project supervisor removed.");
      await refetch();
      return;
    }
    toast.error(res?.message || "Failed to remove project supervisor.");
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
      type: values.type,
      region_id: values.region_id,
      area_id: values.area_id == "" ? null : values.area_id
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

  const MAX_DOC_SIZE = 5 * 1024 * 1024;
  const isPdf = (type: string) => type?.toLowerCase().includes('pdf');
  const isImage = (type: string) => type?.startsWith('image/');
  const normalizeDocName = (name: string) => name.trim().replace(/\s+/g, ' ');
  const slugifyDocName = (name: string) =>
    normalizeDocName(name || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `file-${Date.now()}`;
  const getFileExtension = (file: File) => {
    const ext = file?.name?.split('.').pop();
    if (ext && ext.length < 8) return ext.toLowerCase();
    if (isPdf(file?.type)) return 'pdf';
    if (isImage(file?.type)) return file.type.split('/')[1];
    return 'bin';
  };
  const extractStoragePath = (url: string) => {
    try {
      const afterObject = url.split('/o/')[1];
      const encodedPath = afterObject?.split('?')[0];
      return encodedPath ? decodeURIComponent(encodedPath) : '';
    } catch (err) {
      return '';
    }
  };
  const resetDocForm = () => {
    if (docPreview) URL.revokeObjectURL(docPreview);
    setDocFile(null);
    setDocName('');
    setDocPreview(null);
    setDocType('');
    setDocAccess('public');
    setSelectedPeople([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    const selectedType = selectedFile.type;
    if (!(isPdf(selectedType) || isImage(selectedType))) {
      toast.error('Only images or PDFs are allowed.');
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    if (selectedFile.size > MAX_DOC_SIZE) {
      toast.error('File is too large (max 5MB).');
      setDocFile(null);
      setDocPreview(null);
      setDocType('');
      return;
    }
    setDocFile(selectedFile);
    setDocType(selectedType);
    if (!docName) {
      const inferredName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setDocName(normalizeDocName(inferredName));
    }
    if (isImage(selectedType)) {
      const url = URL.createObjectURL(selectedFile);
      setDocPreview(url);
    } else {
      setDocPreview(null);
    }
  };

  const handleAddDocument = async () => {
    if (uploadingDoc) return;
    const cleanedName = normalizeDocName(docName || docFile?.name || '');
    if (!docFile || !cleanedName) {
      toast.error('Please provide a name and file.');
      return;
    }
    if (docAccess === 'private' && selectedPeople.length === 0) {
      toast.error('Select at least one person for private documents.');
      return;
    }
    const dup = projectDocs.some((d: any) => d?.doc_name?.toLowerCase() === cleanedName.toLowerCase());
    if (dup) {
      toast.error('A document with that name already exists.');
      return;
    }
    const extension = getFileExtension(docFile);
    const safeName = slugifyDocName(cleanedName);
    const storagePath = `project/${params.projectid}/${safeName}/file.${extension}`;
    const storageRef = ref(storage, storagePath);
    const uploaderId = session?.user?.id || project?.data?.admin_id || project?.data?.creator;
    const accessList = docAccess === 'private'
      ? Array.from(new Set([...selectedPeople, uploaderId].filter(Boolean)))
      : [];
    const accessToPeople = projectTeamPeople.filter((person: any) => {
      const personId = person?._id?.toString?.() ?? person?._id;
      return accessList.includes(personId);
    });

    const optimisticId = `temp-${Date.now()}`;
    const optimisticDoc = {
      _id: optimisticId,
      doc_name: cleanedName,
      doc_url: docPreview || '',
      doc_type: docType || docFile.type,
      storage_path: storagePath,
      access_type: docAccess,
      access_to: accessToPeople,
      optimistic: true,
    };

    setUploadingDoc(true);
    setProjectDocs((prev) => [optimisticDoc, ...prev]);
    try {
      await uploadBytes(storageRef, docFile);
      const docUrl = await getDownloadURL(storageRef);
      const formData = new FormData();
      formData.append('body', JSON.stringify({
        project_id: params.projectid,
        doc_name: cleanedName,
        doc_url: docUrl,
        doc_type: docType || docFile.type,
        storage_path: storagePath,
        access_type: docAccess,
        access_to: accessList,
        created_by: uploaderId,
      }));
      const res = await addProjectDoc(formData);
      if (res?.status == 200) {
        toast.success('Document added successfully.');
        const createdDoc = res?.doc ? { ...res.doc, doc_url: res.doc.doc_url } : null;
        if (createdDoc) {
          setProjectDocs((prev) => [createdDoc, ...prev.filter((d: any) => d._id !== optimisticId)]);
        } else {
          await refetch();
        }
      } else {
        setProjectDocs((prev) => prev.filter((d: any) => d._id !== optimisticId));
        await deleteObject(storageRef);
        toast.error(res?.error || 'Failed to add document.');
      }
    } catch (error) {
      console.log(error);
      setProjectDocs((prev) => prev.filter((d: any) => d._id !== optimisticId));
      try {
        await deleteObject(storageRef);
      } catch (err) {
        console.log(err);
      }
      toast.error('Something went wrong while uploading.');
    } finally {
      resetDocForm();
      setUploadingDoc(false);
    }
  }

  const handleRemoveDoc = async (doc: any) => {
    const previousDocs = [...projectDocs];
    setProjectDocs((prev) => prev.filter((d: any) => d?._id !== doc?._id));

    const pathFromUrl = doc?.storage_path || extractStoragePath(doc?.doc_url || '');
    try {
      const res = await removeProjectDoc(doc?._id);
      if(res?.status != 200){
        setProjectDocs(previousDocs);
        toast.error('Failed to remove document.');
        return;
      }
      if (pathFromUrl) {
        const storageRef = ref(storage, pathFromUrl);
        await deleteObject(storageRef);
      }
      toast.success('Document removed successfully.');
    } catch (error) {
      console.log(error);
      setProjectDocs(previousDocs);
      toast.error('Failed to remove document.');
    }
  };

  const confirmRemoveDoc = (doc: any) => {
    setDocToDelete(doc);
    setDeleteDocDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (deletingProject) return;
    const res = await deleteProject(params.projectid);
    if (res?.status === 200) {
      toast.success(res?.message || "Project deleted.");
      setDeleteProjectDialogOpen(false);
      router.push('/admin/projects');
      return;
    }
    toast.error(res?.message || "Failed to delete project.");
  };

  return (
    <div className='p-4 sm:p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative overflow-hidden rounded-2xl border border-cyan-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_18px_60px_-30px_rgba(34,211,238,0.35)] mb-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className='font-medium text-xs text-slate-200 flex items-center gap-1'>
            <PanelsTopLeft strokeWidth={2} size={14} /> Project Details
          </h1>
          <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:items-baseline sm:gap-3'>
            {project?.data?.is_approved ? null : (
              <div className="w-full sm:w-auto">
                {isApproving ? <Button disabled={true} className='w-full text-xs sm:w-auto'>Approving...</Button> : <Button onClick={markAsApproved} className='w-full text-xs sm:w-auto'>Approve</Button> }
              </div>
            )}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='p-2 px-4 group rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center w-full sm:w-auto'
              onClick={handleClickEdit}
            >
              <PencilRuler className='group-hover:text-pink-300' size={12} />
              Edit Info
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='p-2 px-4 group rounded-lg border border-red-700/60 hover:border-red-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center text-red-300 w-full sm:w-auto'
              onClick={() => setDeleteProjectDialogOpen(true)}
            >
              <Trash2 className='group-hover:text-red-200' size={12} />
              Delete
            </motion.div>
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className='text-xl font-semibold tracking-tight text-white'>{project?.data?.project_name || "-"}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overview</p>
              <MarkdownPreview content={project?.data?.project_description} className="text-sm text-slate-200" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/55 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Progress</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{progress || 0}%</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${
                  project?.data?.status == "Pending"
                    ? 'bg-slate-700/50 text-slate-200'
                    : project?.data?.status == "completed"
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : project?.data?.status == "approved"
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : project?.data?.status == "cancelled"
                          ? 'bg-red-500/15 text-red-200'
                          : 'bg-slate-700/50 text-slate-200'
                }`}>
                  {project?.data?.status || "-"}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${Math.min(Math.max(progress || 0, 0), 100)}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Start Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{formatDateTiny(project?.data?.start_date) || "-"}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">End Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{formatDateTiny(project?.data?.end_date) || "-"}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Region</p>
                <p className='mt-2 text-sm font-semibold text-slate-100'>{project?.data?.region?.region_name || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Area</p>
                <p className='mt-2 text-sm font-semibold text-slate-100'>{project?.data?.area?.area_name || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Project Type</p>
                <p className='mt-2 text-sm font-semibold capitalize text-slate-100'>{project?.data?.type || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Priority</p>
                <p className={`mt-2 flex items-center gap-2 text-sm font-semibold capitalize ${project?.data?.priority == "high" ? 'text-red-300' : 'text-slate-100'}`}>
                  <Square color='gray' strokeWidth={1} size={8} fill={project?.data?.priority === "high" ? '#ef4444' : project?.data?.priority === 'normal' ? 'gold' : 'silver'} />
                  {project?.data?.priority || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Users size={14} /> Project Heads
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleOpenProjectHeadDialog}
          >
            <PencilRuler size={12} />
            Assign Head
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {projectHeads.length === 0 && (
            <p className="text-xs text-slate-400">No project heads assigned.</p>
          )}
          {projectHeads.map((head: any) => {
            const headId = head?._id?.toString?.() ?? head?._id ?? "";
            return (
              <div className="w-full p-1 sm:w-1/2 xl:w-1/4" key={headId}>
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                  <div className="flex items-center gap-3">
                    <Avatar className="shrink-0" src={head?.avatar_url || '/avatar.png'} size={40} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{head?.name || "-"}</p>
                      <p className="text-xs text-slate-400">{head?.email || "-"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full p-1 text-red-300 transition hover:bg-slate-800 hover:text-red-200"
                    onClick={() => handleRemoveProjectHead(headId)}
                    disabled={removingProjectHead}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Users size={14} /> Project Supervisors
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleOpenProjectSupervisorDialog}
          >
            <PencilRuler size={12} />
            Assign Supervisor
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {projectSupervisors.length === 0 && (
            <p className="text-xs text-slate-400">No project supervisors assigned.</p>
          )}
          {projectSupervisors.map((user: any) => {
            const userId = user?._id?.toString?.() ?? user?._id ?? "";
            return (
              <div className="w-full p-1 sm:w-1/2 xl:w-1/4" key={userId}>
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                  <div className="flex items-center gap-3">
                    <Avatar className="shrink-0" src={user?.avatar_url || '/avatar.png'} size={40} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{user?.name || "-"}</p>
                      <p className="text-xs text-slate-400">{user?.email || "-"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full p-1 text-red-300 transition hover:bg-slate-800 hover:text-red-200"
                    onClick={() => handleRemoveProjectSupervisor(userId)}
                    disabled={removingProjectSupervisor}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Building size={14} /> Project Departments
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center w-full sm:w-auto'
            onClick={handleNavigateToDepts}
          >
            <PencilRuler size={12} />
            Manage Departments
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {project?.data?.departments?.map((dept: any) => (
            <div className="w-full p-1 sm:w-1/2 xl:w-1/4" key={dept?._id}>
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-cyan-800 flex items-center justify-between">
                <span className="font-medium text-xs text-slate-300">{dept?.department_name}</span>
                {dept?.is_active && <CheckCircle size={14} className="text-cyan-500" />}
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Users size={14} /> Teams
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center w-full sm:w-auto'
            onClick={handleNavigateToTeams}
          >
            <PencilRuler size={12} />
            Manage Teams
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {loadingTeams && (
            <p className="text-xs text-slate-400">Loading teams...</p>
          )}
          {!loadingTeams && teams.length === 0 && (
            <p className="text-xs text-slate-400">No teams added to this project.</p>
          )}
          {teams.map((team: any) => (
            <div className="w-full p-1 sm:w-1/2 xl:w-1/4" key={team?._id}>
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">{team?.team_name}</h1>
                <p className="text-xs text-slate-400">Department: {team?.project_dept_id?.department_name || "-"}</p>
                <p className="text-xs text-slate-400">Lead: {team?.team_head?.name || "-"}</p>
                <p className="text-xs text-slate-400">Members: {team?.members?.length ?? 0}</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      className='p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center absolute top-2 right-2'
                    >
                      <EllipsisVertical size={14} />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className='w-[120px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                        onClick={() => router.push(`/admin/projects/${params.projectid}/teams/${team?._id}`)}
                      >
                        <Eye size={12} />
                        <h1 className='text-xs font-medium'>View Team</h1>
                      </motion.div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Workflow size={14} /> Project Flow (Logs)
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center justify-center w-full sm:w-auto'
            onClick={handleNavigateToFlows}
          >
            <PencilRuler size={12} />
            View All
          </motion.div>
        </div>
        <div className="mt-2 space-y-3">
          {project?.data?.flows?.length === 0 && (
            <p className="text-xs text-slate-400">No activity logs yet.</p>
          )}
          {project?.data?.flows?.map((log: any, index: number) => (
            <div className="relative pl-5" key={log?._id}>
              <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-cyan-400" />
              {index < project?.data?.flows?.length - 1 && (
                <span className="absolute left-[6px] top-4 h-full w-px bg-slate-800" />
              )}
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
                <h1 className="font-medium text-xs text-slate-200">{log?.Log}</h1>
                {log?.description && <p className="text-[11px] text-slate-400 mt-1">{log?.description}</p>}
                <p className="text-[11px] text-slate-500 mt-2">{formatDateTiny(log?.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
              <Files size={14} /> Project Documents
            </h1>
            <p className="text-[11px] text-slate-400">Images or PDFs only • Max 5MB • Names must be unique • Public = all project teams</p>
          </div>
          {uploadingDoc && (
            <div className="flex items-center gap-1 text-[11px] text-cyan-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-800/60 rounded-md">
                <Upload className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-200 font-semibold">Add a document</p>
                <p className="text-[11px] text-slate-400">Stored at project/{params.projectid}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-[11px]">Document Name</Label>
                <Input
                  placeholder="e.g. Contract"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px]">File (image or PDF, max 5MB)</Label>
                <label className="mt-1 block border border-dashed border-slate-700 rounded-lg p-3 bg-slate-900/40 hover:border-cyan-700 transition cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Upload size={14} className="text-cyan-400" />
                      <span className="truncate">{docFile ? docFile.name : 'Choose or drop a file'}</span>
                    </div>
                    {docFile && <span className="text-[11px] text-slate-400">{(docFile.size/1024/1024).toFixed(2)} MB</span>}
                  </div>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  className={`px-3 py-2 rounded-md border ${docAccess === 'public' ? 'border-cyan-600 bg-cyan-900/40 text-cyan-200' : 'border-slate-700 text-slate-300'}`}
                  onClick={() => setDocAccess('public')}
                >
                  Public (everyone)
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 rounded-md border ${docAccess === 'private' ? 'border-amber-500 bg-amber-900/30 text-amber-100' : 'border-slate-700 text-slate-300'}`}
                  onClick={() => setDocAccess('private')}
                >
                  Private (selected)
                </button>
              </div>

              {docAccess === 'private' && (
                <div className="space-y-2 border border-slate-800 rounded-md p-2 max-h-36 overflow-y-auto bg-slate-900/40">
                  <p className="text-[11px] text-slate-400">Select team members who should see this document</p>
                  {projectTeamPeople?.length === 0 && <p className="text-[11px] text-slate-500">No team members found.</p>}
                  {projectTeamPeople?.map((person: any) => {
                    const personId = person?._id?.toString?.() ?? person?._id ?? "";
                    const name = person?.name || person?.Name || 'User';
                    const roles = person?.roles || [];
                    const teams = person?.teams || [];
                    return (
                      <div key={personId} className="flex flex-col gap-1 text-xs text-slate-200 cursor-pointer border-b border-slate-800/60 pb-2 last:border-b-0">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPeople.includes(personId)}
                            onCheckedChange={(val) => {
                              if (val) {
                                setSelectedPeople((prev) => [...prev, personId]);
                              } else {
                                setSelectedPeople((prev) => prev.filter((id) => id !== personId));
                              }
                            }}
                          />
                          <span className="truncate">{name}</span>
                        </label>
                        <div className="flex flex-wrap gap-1 ml-6">
                          {roles.length > 0 ? roles.map((role: string) => (
                            <span key={role} className="px-2 py-0.5 rounded-full bg-slate-800/70 border border-slate-700 text-[10px] text-slate-200">
                              {role}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-500">No roles</span>
                          )}
                          {teams.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-900/70 border border-slate-700 text-[10px] text-slate-400">
                              {teams.length} team{teams.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {docPreview && (
                <div className="rounded-md border border-slate-800 overflow-hidden bg-slate-900/60">
                  <Image
                    src={docPreview}
                    alt="Selected document preview"
                    width={400}
                    height={220}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
              {!docPreview && docFile && (isPdf(docType || docFile.type)) && (
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/50 border border-slate-800 rounded-md p-2">
                  <FileText className="h-4 w-4 text-amber-300" />
                  <span>PDF ready to upload</span>
                </div>
              )}

              <Button
                onClick={handleAddDocument}
                disabled={uploadingDoc}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs"
              >
                {uploadingDoc ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Upload document
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-wrap">
              {projectDocs?.length === 0 && (
                <div className="w-full p-4 border border-dashed border-slate-800/80 rounded-lg text-center text-xs text-slate-400 bg-slate-900/40">
                  No documents added yet.
                </div>
              )}
              {projectDocs?.map((doc: any) => {
                const type = doc?.doc_type || doc?.file_type || '';
                const docIsPdf = isPdf(type) || doc?.doc_url?.toLowerCase()?.includes('.pdf');
                const docIsImage = isImage(type) || (!docIsPdf && !type);
                const accessUsers = doc?.access_to || [];
                const accessLabel = doc?.access_type === 'private' ? 'Private' : 'Public';
                return (
                  <div className="w-full md:w-1/2 xl:w-1/3 p-1" key={doc?._id || doc?.doc_name}>
                    <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-800 rounded-lg overflow-hidden relative">
                      <button
                        onClick={() => confirmRemoveDoc(doc)}
                        className="absolute right-2 top-2 z-10 bg-black/60 hover:bg-red-900/60 text-slate-200 hover:text-white rounded-full p-1"
                        aria-label="Remove document"
                      >
                        <X size={14} />
                      </button>
                      <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                        {docIsImage && doc?.doc_url ? (
                          <Image
                            src={doc?.doc_url}
                            alt={doc?.doc_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 text-xs gap-1">
                            <FileText className="h-6 w-6 text-amber-300" />
                            <span>PDF file</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 text-xs text-slate-200 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-semibold truncate" title={doc?.doc_name}>{doc?.doc_name}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {docIsPdf ? 'PDF' : 'Image'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                          <span className={`px-2 py-0.5 rounded-full border ${doc?.access_type === 'private' ? 'border-amber-400 text-amber-200' : 'border-cyan-500 text-cyan-200'}`}>
                            {accessLabel}
                          </span>
                          {doc?.doc_url && <a className="text-cyan-400 hover:text-cyan-300 font-medium" href={doc?.doc_url} target="_blank" rel="noreferrer">Open</a>}
                        </div>
                        {doc?.access_type === 'private' && (
                          <div className="flex flex-wrap gap-1">
                            {accessUsers?.length === 0 && <span className="text-[10px] text-slate-500">No viewers</span>}
                            {accessUsers?.map((user: any) => {
                              const name = user?.name || user?.Name || 'User';
                              const roles = user?.roles || [];
                              return (
                                <span key={user?._id || name} className="px-2 py-1 rounded-md bg-slate-800/70 text-[10px] text-slate-200 border border-slate-700">
                                  {name}
                                  {roles?.length > 0 && (
                                    <span className="ml-1 text-[9px] text-slate-400">
                                      ({roles.join(', ')})
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={updateProjectDialog} onOpenChange={setUpdateProjectDialog}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-none sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Project</DialogTitle>
            <DialogDescription>Updating project details.</DialogDescription>
          </DialogHeader>
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Project Name</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="Project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Description</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Textarea
                          placeholder="Project description"
                          className="min-h-32 resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Start Date</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="Start date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">End Date</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <Input placeholder="End date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Region</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          value={field.value ?? ""}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          {businessRegions && businessRegions.length > 0 ? (
                            <>
                              <option value="">Select Region</option>
                              {businessRegions.map((region: any) => (
                                <option key={region._id} value={region._id}>
                                  {region.region_name}
                                </option>
                              ))}
                            </>
                          ) : (
                            <option value="">No Regions</option>
                          )}
                        </select>
                      </FormControl>
                      {selectedRegionId && loadingAreas && (
                        <FormDescription className="text-xs text-slate-400">Loading areas...</FormDescription>
                      )}
                      {selectedRegionId && !loadingAreas && regionAreas.length === 0 && (
                        <FormDescription className="text-xs text-slate-400">No areas for this region.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRegionId && regionAreas.length > 0 && (
                  <FormField
                    control={form.control}
                    name="area_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-300 font-semibold">Area (Optional)</FormLabel>
                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                          <select
                            {...field}
                            value={field.value ?? ""}
                            className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                          >
                            <option value="">Select Area (Optional)</option>
                            {regionAreas.map((area: any) => (
                              <option key={area._id} value={area._id}>
                                {area.area_name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Priority</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          {DEPARTMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Status</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Priority</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <select
                          {...field}
                          className='w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
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
                    className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold'
                  >
                    Update Data
                  </motion.button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDocDialogOpen} onOpenChange={setDeleteDocDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove document?</DialogTitle>
            <DialogDescription>This will delete the file from storage and records.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDeleteDocDialogOpen(false); setDocToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if(docToDelete) handleRemoveDoc(docToDelete); setDeleteDocDialogOpen(false); setDocToDelete(null); }}>Remove</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>This will remove the project and its related records. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteProjectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deletingProject}>
              {deletingProject ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={projectHeadDialogOpen} onOpenChange={setProjectHeadDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Project Head</DialogTitle>
            <DialogDescription>Add another project head to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Search staff by name"
              value={projectHeadSearch}
              onChange={(e) => setProjectHeadSearch(e.target.value)}
            />
          </div>
          <div className="relative flex-1 overflow-y-auto pb-4">
            {loadingBusinessStaffs && (
              <div className="flex h-[10vh] items-center justify-center">
                <LoaderSpin size={30} />
              </div>
            )}
            {!loadingBusinessStaffs && filteredProjectHeadStaffs.length === 0 && (
              <div className='w-full h-[10vh] flex items-center justify-center'>
                <h1 className="text-xs font-medium text-slate-400">
                  {projectHeadSearch.trim() ? "No matching users" : "No available staffs found"}
                </h1>
              </div>
            )}
            {filteredProjectHeadStaffs.map((staff: any) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={staff?._id}
                className="mt-2 flex cursor-pointer items-center justify-start gap-1 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-2 px-4 text-sm font-medium group relative"
                onClick={() => setSelectedProjectHeadId(staff?.user_id?._id)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="shrink-0" src={staff?.user_id?.avatar_url || '/avatar.png'} size={30} />
                  <div>
                    <h1 className="text-xs font-medium">{staff?.user_id?.name}</h1>
                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                  </div>
                </div>
                {staff?.user_id?._id === selectedProjectHeadId && (
                  <div className="absolute right-2 top-1">
                    <Check className="text-cyan-600" strokeWidth={3} size={18} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddProjectHead} disabled={addingProjectHead}>
              {addingProjectHead ? "Adding..." : "Add Project Head"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={projectSupervisorDialogOpen} onOpenChange={setProjectSupervisorDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Project Supervisor</DialogTitle>
            <DialogDescription>Add a supervisor to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Search staff by name"
              value={projectSupervisorSearch}
              onChange={(e) => setProjectSupervisorSearch(e.target.value)}
            />
          </div>
          <div className="relative flex-1 overflow-y-auto pb-4">
            {loadingBusinessStaffs && (
              <div className="flex h-[10vh] items-center justify-center">
                <LoaderSpin size={30} />
              </div>
            )}
            {!loadingBusinessStaffs && filteredProjectSupervisorStaffs.length === 0 && (
              <div className='w-full h-[10vh] flex items-center justify-center'>
                <h1 className="text-xs font-medium text-slate-400">
                  {projectSupervisorSearch.trim() ? "No matching users" : "No available staffs found"}
                </h1>
              </div>
            )}
            {filteredProjectSupervisorStaffs.map((staff: any) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={staff?._id}
                className="mt-2 flex cursor-pointer items-center justify-start gap-1 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-2 px-4 text-sm font-medium group relative"
                onClick={() => setSelectedProjectSupervisorId(staff?.user_id?._id)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="shrink-0" src={staff?.user_id?.avatar_url || '/avatar.png'} size={30} />
                  <div>
                    <h1 className="text-xs font-medium">{staff?.user_id?.name}</h1>
                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                  </div>
                </div>
                {staff?.user_id?._id === selectedProjectSupervisorId && (
                  <div className="absolute right-2 top-1">
                    <Check className="text-cyan-600" strokeWidth={3} size={18} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddProjectSupervisor} disabled={addingProjectSupervisor}>
              {addingProjectSupervisor ? "Adding..." : "Add Project Supervisor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectView;
