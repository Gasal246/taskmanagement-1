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
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

const ProjectDepartments = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [addDepartmentDialog, setAddDepartmentDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [isAddingDepartments, setIsAddingDepartments] = useState(false);
  const { data: businessDepartmentsData } = useGetBusinessDepartmentsByBusiness_id(businessData?._id);
  const { data: project_depts, refetch: refetchProjectDepts } = useGetAddedProjectDepartments(params.projectid);
  const { mutateAsync: addProjectDept } = useAddProjectDepartment();
  const { mutateAsync: selectActiveDept } = useSelectActiveProjectDepartment();
  const { mutateAsync: removeProjDept, isPending: removingProjDept } = useRemoveAddedProjectDepartment();

  useEffect(() => {
    setAvailableDepartments([
      ...(businessDepartmentsData?.region_departments || []).flatMap((r: any) => r.departments || []),
      ...(businessDepartmentsData?.area_departments || []).flatMap((a: any) => a.departments || []),
      ...(businessDepartmentsData?.location_departments || []).flatMap((l: any) => l.departments || []),
    ].filter((department: any) => Number(department?.status) === 1));
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

  const toggleDepartmentSelection = (deptId: string) => {
    setSelectedDepartmentIds((currentIds) =>
      currentIds.includes(deptId)
        ? currentIds.filter((id) => id !== deptId)
        : [...currentIds, deptId]
    );
  };

  const handleAddDepartments = async () => {
    if (selectedDepartmentIds.length === 0) {
      toast.error("Please select at least one department.");
      return;
    }

    setIsAddingDepartments(true);

    try {
      const results = await Promise.allSettled(
        selectedDepartmentIds.map((deptId) =>
          addProjectDept({
            project_id: params.projectid,
            department_id: deptId,
            department_name:
              availableDepartments.find((dept) => dept._id.toString() === deptId)?.dep_name || "Unknown",
            is_active: false,
          })
        )
      );

      const successfulIds = selectedDepartmentIds.filter((_, index) => {
        const result = results[index];
        return result.status === "fulfilled" && result.value?.status === 201;
      });
      const failedIds = selectedDepartmentIds.filter((id) => !successfulIds.includes(id));

      if (successfulIds.length > 0) {
        toast.success(
          `${successfulIds.length} ${successfulIds.length === 1 ? "department" : "departments"} added to the project successfully`
        );
        await refetchProjectDepts();
      }

      if (failedIds.length > 0) {
        toast.error(
          `${failedIds.length} ${failedIds.length === 1 ? "department could" : "departments could"} not be added. Please try again.`
        );
        setSelectedDepartmentIds(failedIds);
        return;
      }

      setSelectedDepartmentIds([]);
      setSearchQuery("");
      setAddDepartmentDialog(false);
    } finally {
      setIsAddingDepartments(false);
    }
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
    <div className='p-4 sm:p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-4'>
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
            <BreadcrumbPage>Departments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.35em] text-cyan-400/70">Project Departments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2.5 px-4 rounded-lg border border-slate-700 hover:border-cyan-500 bg-gradient-to-tr from-slate-900 to-slate-800 text-xs font-semibold flex gap-2 items-center justify-center w-full sm:w-auto'
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          if (!open && isAddingDepartments) return;
          setAddDepartmentDialog(open);
          if (!open) {
            setSelectedDepartmentIds([]);
            setSearchQuery("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px] max-h-[75vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Departments to Project</DialogTitle>
            <DialogDescription>Select one or more departments to contribute to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isAddingDepartments}
                className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
              />
              <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              Departments already linked to this project are hidden from the list.
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300">
                {selectedDepartmentIds.length} {selectedDepartmentIds.length === 1 ? "department" : "departments"} selected
              </span>
              {selectedDepartmentIds.length > 0 && (
                <button
                  type="button"
                  className="text-slate-400 transition hover:text-slate-200"
                  onClick={() => setSelectedDepartmentIds([])}
                  disabled={isAddingDepartments}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 space-y-2 overflow-y-auto mt-3 pb-16">
            {filteredAvailableDepartments?.length > 0 ? (
              filteredAvailableDepartments.map((dept: any) => {
                const departmentId = dept._id.toString();
                const isSelected = selectedDepartmentIds.includes(departmentId);

                return (
                  <motion.div
                    key={departmentId}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-disabled={isAddingDepartments}
                    tabIndex={isAddingDepartments ? -1 : 0}
                    className={`p-3 rounded-lg cursor-pointer border ${
                      isSelected
                        ? 'border-cyan-400/60 bg-cyan-500/10'
                        : 'border-slate-800 hover:border-slate-600 bg-slate-950/30'
                    } relative ${isAddingDepartments ? 'pointer-events-none opacity-60' : ''}`}
                    onClick={() => toggleDepartmentSelection(departmentId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleDepartmentSelection(departmentId);
                      }
                    }}
                  >
                    <p className="text-sm font-medium text-slate-100">{dept.dep_name}</p>
                    <p className="text-[11px] text-slate-400">Type: {dept?.type || 'General'}</p>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={16} className="text-cyan-400" />
                      </div>
                    )}
                  </motion.div>
                );
              })
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
                onClick={handleAddDepartments}
                disabled={selectedDepartmentIds.length === 0 || isAddingDepartments}
                className="w-full bg-gradient-to-tr from-slate-900 to-slate-800 p-3 hover:border-cyan-500 border border-slate-700 select-none rounded-lg flex items-center gap-2 justify-center text-sm font-semibold text-slate-200 disabled:opacity-50"
              >
                <Plus size={16} />
                {isAddingDepartments
                  ? "Adding departments..."
                  : selectedDepartmentIds.length > 0
                    ? `Add ${selectedDepartmentIds.length} ${selectedDepartmentIds.length === 1 ? "Department" : "Departments"}`
                    : "Add Departments"}
              </motion.button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDepartments;
