"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Building, CheckCircle, Plus, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { useAddProjectDepartment, useGetAddedProjectDepartments, useGetBusinessDepartments, useGetBusinessDepartmentsByBusiness_id, useRemoveAddedProjectDepartment, useSelectActiveProjectDepartment } from '@/query/business/queries';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

// Sample data for added and available departments
const sampleDepartments = {
  added: [
    { _id: "dept1", department_name: "Engineering", isActive: false },
    { _id: "dept2", department_name: "Marketing", isActive: false },
    { _id: "dept3", department_name: "Sales", isActive: false }
  ],
  available: [
    { _id: "dept4", department_name: "HR" },
    { _id: "dept5", department_name: "Finance" },
    { _id: "dept6", department_name: "Operations" }
  ]
};

const ProjectDepartments = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [addedDepartments, setAddedDepartments] = useState(sampleDepartments.added);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [addDepartmentDialog, setAddDepartmentDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const { data: businessDepartmentsData, isPending, refetch } = useGetBusinessDepartmentsByBusiness_id(businessData?._id);
  const { data:project_depts, isPending: fetchingProjectDepts, refetch: refetchProjectDepts } = useGetAddedProjectDepartments(params.projectid);
  const {mutateAsync: addProjectDept, isPending: addingProjectDept} = useAddProjectDepartment();
  const {mutateAsync: selectActiveDept, isPending: selectingActiveDept} = useSelectActiveProjectDepartment();
  const {mutateAsync: removeProjDept, isPending: removingProjDept} = useRemoveAddedProjectDepartment();

  useEffect(() => {
    console.log("depts: ", businessDepartmentsData);
    setAvailableDepartments([
      ...(businessDepartmentsData?.region_departments || []).flatMap((r:any) => r.departments || []),
      ...(businessDepartmentsData?.area_departments || []).flatMap((a:any) => a.departments || []),
      ...(businessDepartmentsData?.location_departments || []).flatMap((l:any) => l.departments || []),
    ])
  }, [businessDepartmentsData]);

  const handleSelectDepartment = async (deptId: string, e: React.MouseEvent) => {
    const res = await selectActiveDept(deptId);
    if(res.status == 200){
      toast.success("Active department selected successfully");
      refetchProjectDepts();
    } else {
      toast.error("Error while selecting active department");
    }
  };

  const handleAddDepartment = async(deptId: string) => {
    if (!deptId) {
      toast.error("Please select a department.");
      return;
    }
    const data = {
      project_id: params.projectid,
      department_id: deptId,
      department_name: availableDepartments.find(dept => dept._id === deptId)?.dep_name || "Unknown",
      is_active: false
    }
    const res = await addProjectDept(data);
    
    if(res.status == 201){
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

  const handleRemoveDepartment = async(deptId: string, e: React.MouseEvent) => {
    const res = await removeProjDept(deptId);
    
    if(res.status == 200){
      toast.success("Department removed from project successfully");
      refetchProjectDepts();
    } else {
      toast.error("Error while removing department from project");
    }
  };

  const filteredAvailableDepartments = availableDepartments.filter(dept =>
  // matches search
  dept.dep_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
  // not already added
  !project_depts?.data?.some((p:any) => p.department_id.toString() === dept._id.toString())
);

  return (
    <div className='p-5 overflow-y-scroll pb-20 bg-slate-900 min-h-screen'>
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
            <BreadcrumbPage>Departments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Building size={14} /> Added Departments
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={() => setAddDepartmentDialog(true)}
          >
            <Plus size={12} />
            Add Department
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {project_depts?.data?.length > 0 ? (
            project_depts.data?.map((dept: any) => (
              <div className="w-full lg:w-3/12 p-1" key={dept._id}>
                <div className={`bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border ${
                    dept.is_active ? 'border-cyan-500' : 'border-slate-700'
                  } hover:border-cyan-800 relative`}>
                  <motion.h1
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="font-medium text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
                    onClick={(e) => handleSelectDepartment(dept._id, e)}
                  >
                    {dept.department_name}
                    {dept.is_active && <CheckCircle size={12} className="text-cyan-500 ml-1" />}
                  </motion.h1>
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className='p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center absolute top-1 right-2'
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[120px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                      <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                        <div className='w-full p-0.5 space-y-1'>
                          <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                            onClick={(e) => handleRemoveDepartment(dept._id, e)}
                          >
                            <Trash2 size={12} />
                            <h1 className='text-xs font-medium'>Remove</h1>
                          </motion.div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No departments added to this project.</p>
          )}
        </div>
      </div>

      {/* Add Department Modal */}
      <Dialog open={addDepartmentDialog} onOpenChange={(open) => {
        setAddDepartmentDialog(open);
        if (!open) {
          setSelectedDepartmentId("");
          setSearchQuery("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Department to Project</DialogTitle>
            <DialogDescription>Select a department to add to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
              />
              <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto pb-16">
            {filteredAvailableDepartments?.length > 0 ? (
              filteredAvailableDepartments.map((dept: any) => (
                <motion.div
                  key={dept._id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-2 rounded-lg cursor-pointer hover:bg-slate-800 relative"
                  onClick={() => setSelectedDepartmentId(dept._id)}
                >
                  <p className="text-sm font-medium text-slate-200">{dept.dep_name}</p>
                  <p className="text-xs text-slate-400">Type: {dept?.type}</p>
                  {selectedDepartmentId === dept._id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle size={16} className="text-cyan-500" />
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="flex items-center justify-center h-[10vh]">
                <p className="text-xs text-slate-400">{searchQuery.trim() ? "No matching departments." : "No available departments found."}</p>
              </div>
            )}
          </div>
          <DialogFooter className="w-full">
            <div className="pt-2 bg-slate-950/80 w-full">
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddDepartment(selectedDepartmentId)}
                className="w-full bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
                <Plus size={16} />
                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add Department</h1>
              </motion.div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDepartments;
