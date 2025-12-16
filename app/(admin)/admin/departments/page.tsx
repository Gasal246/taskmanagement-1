"use client"
import { EllipsisVertical, Eye, PencilRuler, Plus, ReplaceAll, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { useAddBusinessDepartment, useEditBusinessDepartment, useGetBusinessDepartments, useRemoveBusinessDepartment } from '@/query/business/queries';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Popconfirm } from 'antd';
import { toast } from 'sonner';
import { loadAdminBusinessPlan, loadDepartmentData } from '@/redux/slices/application';
import { useRouter } from 'next/navigation';
import LoaderSpin from '@/components/shared/LoaderSpin';

const Departments = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [business_deps, setBusinessDeps] = useState<any[]>([]);
  const [business_plan, setBusinessPlan] = useState<any>(null);
  const [addDepDialog, setAddDepDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [depName, setDepName] = useState("");
  const [depId, setDepId] = useState("");

  const { mutateAsync: getBusinessDepartments, isPending: loadingBusinessDeps } = useGetBusinessDepartments();
  const { mutateAsync: addBusinessDep } = useAddBusinessDepartment();
  const { mutateAsync: editBusinessDep } = useEditBusinessDepartment();
  const { mutateAsync: removeBusinessDep } = useRemoveBusinessDepartment();

  const handleGetBusinessDeps = async () => {
    if(!businessData?._id) return;
    const res = await getBusinessDepartments(businessData?._id);
    if (res?.status === 200) {
      setBusinessDeps(res?.departments);
      setBusinessPlan(res?.businessPlan);
    }
  }

  const handleAddDep = async () => {
    if(!businessData?._id) return;
    if(!depName) {
      return toast.error("Department name is required")
    }
    const formData = new FormData();
    formData.append("body", JSON.stringify({
      dep_name: depName,
      business_id: businessData?._id
    }))
    const res = await addBusinessDep(formData);
    if(res?.status === 200){
      toast.success("Department added successfully.");
      handleGetBusinessDeps();
      setAddDepDialog(false);
      setDepName("");
    } else {
      toast.error(res?.message || "Failed to add department.");
    }
  }

  const handleEditClick = (dep: any) => {
    setIsEdit(true)
    setDepName(dep?.dep_name);
    setDepId(dep?._id);
    setAddDepDialog(true);
  }

  const handleEditDep = async () => {
    if(!depName) {
      return toast.error("Department name is required")
    }
    const formData = new FormData();
    formData.append("body", JSON.stringify({
      dep_name: depName,
      BDepId: depId
    }))
    const res = await editBusinessDep(formData);
    if(res?.status === 200){
      toast.success("Department updated successfully.");
      handleGetBusinessDeps();
      setAddDepDialog(false);
      setDepName("");
    } else {
      toast.error(res?.message || "Failed to update department.");
    }
  }

  const handleRemoveDep = async (BDepId: string) => {
    if(!BDepId) return;
    const res = await removeBusinessDep(BDepId);
    if(res?.status === 200){
      toast.success("Department removed successfully.");
      handleGetBusinessDeps();
    } else {
      toast.error(res?.message || "Failed to remove department.");
    }
  }

  const handleViewDep = async (dep: any) => {
    dispatch(loadDepartmentData(dep))
    dispatch(loadAdminBusinessPlan(business_plan))
    router.push(`/admin/departments/department`)
  }

  useEffect(() => {
    if(businessData?._id) handleGetBusinessDeps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessData]);

  return (
    <div className='p-4 pb-10'>
      <div className="flex justify-between bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg mb-2">
        <h1 className='font-bold text-md flex gap-2 items-center'><ReplaceAll size={18} /> Department Management</h1>
      </div>
      <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg min-h-[50vh]">
        <div className="flex flex-wrap items-center justify-between">
          <h1 className='font-medium text-sm px-3'>{business_deps?.length} / {business_plan?.deps_count}, Business Departments</h1>
          <motion.div
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            className='flex gap-1 items-center cursor-pointer border border-slate-800 hover:border-cyan-600 bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-2 px-4 rounded-lg text-sm'
            onClick={() => setAddDepDialog(true)}
          >
            <Plus size={14} />
            Add Department
          </motion.div>
        </div>

        {loadingBusinessDeps && <div className="flex items-center justify-center h-[20vh]">
            <LoaderSpin size={50} />
          </div>}

        {business_deps?.length === 0 && (
          <div className="flex items-center justify-center h-[20vh]">
            <h1 className="font-medium text-sm px-3">No Departments Added</h1>
          </div>
        )}

        {business_deps?.length > 0 && (
          <div className="flex flex-wrap">
            {business_deps?.map((dep: any) => <div className="w-full p-1 lg:w-3/12" key={dep?._id}>
              <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg border border-slate-700 hover:border-cyan-600 relative">
                <h1 className="font-medium text-sm px-3">{dep?.dep_name || "Unknown Department"}</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.98 }}
                      className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                    >
                      <EllipsisVertical size={18} />
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                      <div className='w-full p-0.5 space-y-1'>
                        <motion.div onClick={() => handleViewDep(dep)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                          <Eye size={14} />
                          <h1 className='text-xs font-semibold'>View</h1>
                        </motion.div>
                        <motion.div onClick={() => handleEditClick(dep)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-purple-500 cursor-pointer hover:text-purple-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                          <PencilRuler size={14} />
                          <h1 className='text-xs font-semibold'>Update</h1>
                        </motion.div>
                        <Popconfirm title="Are you sure to delete this department?" onConfirm={() => handleRemoveDep(dep?._id)}>
                          <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                            <Trash2 size={14} />
                            <h1 className='text-xs font-semibold'>Delete</h1>
                          </motion.div>
                        </Popconfirm>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>)}
          </div>
        )}
      </div>


      <Dialog open={addDepDialog} onOpenChange={setAddDepDialog}>
        <DialogContent className="lg:w-[450px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit" : "Add"} Department</DialogTitle>
            {isEdit ? <DialogDescription>Deparment is being edited.</DialogDescription> : <DialogDescription>You have added <span className='font-semibold text-cyan-600'>{business_deps?.length}</span> departments out of <span className='font-semibold text-cyan-600'>{business_plan?.deps_count}</span> allowed.</DialogDescription>}
          </DialogHeader>
          <div className="">
            <Input placeholder="Department Name" value={depName} onChange={(e) => setDepName(e.target.value)} />
            <motion.div
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={isEdit ? handleEditDep : handleAddDep}
              className="bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mt-3 flex items-center gap-1 justify-center">
              {isEdit ? <PencilRuler size={16} /> : <Plus size={16} />}
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">{isEdit ? "Update" : "Add New"} Department</h1>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Departments
