"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Building, CheckCircle, Plus, Sparkles, Trash2, Search, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { useAddProjectDepartment, useGetAddedProjectDepartments, useGetBusinessDepartmentsByBusiness_id, useRemoveAddedProjectDepartment, useSelectActiveProjectDepartment } from '@/query/business/queries';
import Cookies from "js-cookie";

const ProjectDepartments = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const [businessId, setBusinessId] = useState("");
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [addDepartmentDialog, setAddDepartmentDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const { data: businessDepartmentsData } = useGetBusinessDepartmentsByBusiness_id(businessId);
  const { data: project_depts, refetch: refetchProjectDepts } = useGetAddedProjectDepartments(params.projectid);
  const { mutateAsync: addProjectDept, isPending: addingProjectDept } = useAddProjectDepartment();
  const { mutateAsync: selectActiveDept } = useSelectActiveProjectDepartment();
  const { mutateAsync: removeProjDept, isPending: removingProjDept } = useRemoveAddedProjectDepartment();

  useEffect(() => {
    const domainCookies = Cookies.get("user_domain");
    if (!domainCookies) {
      setBusinessId("");
      return;
    }
    try {
      const domainJson = JSON.parse(domainCookies);
      setBusinessId(domainJson?.business_id || "");
    } catch (error) {
      console.log("Invalid domain cookie", error);
      setBusinessId("");
    }
  }, []);

  useEffect(() => {
    setAvailableDepartments([
      ...(businessDepartmentsData?.region_departments || []).flatMap((r: any) => r.departments || []),
      ...(businessDepartmentsData?.area_departments || []).flatMap((a: any) => a.departments || []),
      ...(businessDepartmentsData?.location_departments || []).flatMap((l: any) => l.departments || []),
    ]);
  }, [businessDepartmentsData]);

  const addedDepartments = useMemo(() => project_depts?.data || [], [project_depts?.data]);
  const activeDepartment = addedDepartments.find((dept: any) => dept?.is_active);

  const filteredAvailableDepartments = useMemo(() => {
    return availableDepartments.filter((dept) =>
      dept.dep_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !addedDepartments?.some((p: any) => p.department_id.toString() === dept._id.toString())
    );
  }, [availableDepartments, searchQuery, addedDepartments]);

  const handleSelectDepartment = async (deptId: string) => {
    const res = await selectActiveDept(deptId);
    if (res.status == 200) {
      toast.success("Active department selected successfully");
      refetchProjectDepts();
    } else {
      toast.error("Error while selecting active department");
    }
  };

  const handleAddDepartment = async (deptId: string) => {
    if (!deptId) {
      toast.error("Please select a department.");
      return;
    }
    const data = {
      project_id: params.projectid,
      department_id: deptId,
      department_name: availableDepartments.find((dept) => dept._id === deptId)?.dep_name || "Unknown",
      is_active: false
    };
    const res = await addProjectDept(data);

    if (res.status == 201) {
      toast.success("Department added to project successfully");
      setAddDepartmentDialog(false);
      refetchProjectDepts();
    } else {
      toast.error("Error while adding department to project");
    }
    setSelectedDepartmentId("");
    setSearchQuery("");
    setAddDepartmentDialog(false);
  };

  const handleRemoveDepartment = async (deptId: string) => {
    const res = await removeProjDept(deptId);

    if (res.status == 200) {
      toast.success("Department removed from project successfully");
      refetchProjectDepts();
    } else {
      toast.error("Error while removing department from project");
    }
  };

  return (
    <div className='p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-4'>
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
            <BreadcrumbPage>Departments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.35em] text-cyan-400/70">Project Departments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2.5 px-4 rounded-lg border border-slate-700 hover:border-cyan-500 bg-gradient-to-tr from-slate-900 to-slate-800 text-xs font-semibold flex gap-2 items-center'
            onClick={() => setAddDepartmentDialog(true)}
          >
            <Plus size={14} />
            Add Department
          </motion.button>
        </div>

        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Departments linked</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{addedDepartments.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Across all project scopes</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Active department</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <ShieldCheck size={16} className="text-emerald-300" />
              {activeDepartment?.department_name || "Not set"}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Used as the primary workflow</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Building size={16} className="text-cyan-300" />
            Added Departments
          </h2>
          <p className="text-xs text-slate-500">Tap a card to set it active.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {addedDepartments?.length > 0 ? (
            addedDepartments.map((dept: any) => (
              <div
                key={dept._id}
                className={`rounded-xl border p-4 transition ${
                  dept.is_active
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{dept.department_name}</p>
                    <p className="text-[11px] text-slate-400">Project department</p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-1 rounded-full hover:bg-slate-800 text-xs font-medium flex items-center'
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[150px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                      <div className='flex flex-col items-start gap-1 bg-black rounded-lg p-1'>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-slate-800/50 w-full p-2 text-red-500 cursor-pointer hover:text-red-400 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                          onClick={() => handleRemoveDepartment(dept._id)}
                          disabled={removingProjDept}
                        >
                          <Trash2 size={12} />
                          <span className='text-xs font-medium'>Remove</span>
                        </motion.button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSelectDepartment(dept._id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                      dept.is_active
                        ? 'border-emerald-400/60 text-emerald-200 bg-emerald-500/10'
                        : 'border-slate-700 text-slate-300 hover:border-cyan-500/60'
                    }`}
                  >
                    {dept.is_active ? 'Active Department' : 'Mark Active'}
                  </motion.button>
                  {dept.is_active && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-200">
                      <CheckCircle size={12} />
                      Primary
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No departments added to this project yet.
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={addDepartmentDialog}
        onOpenChange={(open) => {
          setAddDepartmentDialog(open);
          if (!open) {
            setSelectedDepartmentId("");
            setSearchQuery("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px] max-h-[75vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Department to Project</DialogTitle>
            <DialogDescription>Choose a department to contribute to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
              />
              <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              Departments already linked to this project are hidden from the list.
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto mt-3 pb-16">
            {filteredAvailableDepartments?.length > 0 ? (
              filteredAvailableDepartments.map((dept: any) => (
                <motion.div
                  key={dept._id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-lg cursor-pointer border ${
                    selectedDepartmentId === dept._id
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-600 bg-slate-950/30'
                  } relative`}
                  onClick={() => setSelectedDepartmentId(dept._id)}
                >
                  <p className="text-sm font-medium text-slate-100">{dept.dep_name}</p>
                  <p className="text-[11px] text-slate-400">Type: {dept?.type || 'General'}</p>
                  {selectedDepartmentId === dept._id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle size={16} className="text-cyan-400" />
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="flex items-center justify-center h-[12vh]">
                <p className="text-xs text-slate-400">
                  {searchQuery.trim() ? "No matching departments." : "No available departments found."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="w-full">
            <div className="pt-2 bg-slate-950/80 w-full">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddDepartment(selectedDepartmentId)}
                disabled={!selectedDepartmentId || addingProjectDept}
                className="w-full bg-gradient-to-tr from-slate-900 to-slate-800 p-3 hover:border-cyan-500 border border-slate-700 select-none rounded-lg flex items-center gap-2 justify-center text-sm font-semibold text-slate-200 disabled:opacity-50"
              >
                <Plus size={16} />
                {addingProjectDept ? "Adding..." : "Add Department"}
              </motion.button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDepartments;
