"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlignStartVertical, EllipsisVertical, PencilRuler, Plus, Trash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Popconfirm } from 'antd';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAddPlan, useDeletePlan, useEditPlan, useGetPlans } from '@/query/superadmin/query';
import LoaderSpin from '@/components/shared/LoaderSpin';

const BusinessPlans = () => {
    const [planDialogOpen, setPlanDialogOpen] = useState(false);
    const [modelData, setModelData] = useState<any>(null);
    const [isEdit, setIsEdit] = useState(false);

    const { data: plans, isLoading: loadingPlans } = useGetPlans();
    const { mutateAsync: addNewPlan, isPending: addingNewPlan } = useAddPlan();
    const { mutateAsync: editPlan, isPending: editingPlan } = useEditPlan();
    const { mutateAsync: deletePlan, isPending: deletingPlan } = useDeletePlan();

    const [businessPlans, setBusinessPlans] = useState<any[]>([]);

    useEffect(() => {
        if(plans) {
            setBusinessPlans(plans);
        }
    }, [plans])

    const handlePlanSubmit = () => {
        if (isEdit) {
            handleEditPlan();
        } else {
            handleAddPlan();
        }
    }

    const handleAddPlanClick = () => {
        setIsEdit(false);
        setModelData(null);
        setPlanDialogOpen(true);
    }
    const handleAddPlan = async () => {
        if (!modelData?.plan_name || !modelData?.deps_count || !modelData?.staff_count || !modelData?.region_count) {
            toast.error('Please fill all the fields.', {
                duration: 3000,
                description: 'make sure you have filled the required fields before saving.',
            });
            return;
        }
        try {
            const formData = new FormData();
            formData.append('body', JSON.stringify(modelData));
            await addNewPlan(formData);
            toast.success('Plan added successfully.', {
                duration: 3000,
                description: 'Plan added successfully.',
            });
            setPlanDialogOpen(false);
            setModelData(null);
        } catch (error) {
            toast.error('Failed to add plan.', {
                duration: 3000,
                description: 'Failed to add plan.',
            });
        }
    }

    const handleClickEditPlan = (plan: any) => {
        console.log(plan)
        setIsEdit(true);
        setModelData(plan);
        setPlanDialogOpen(true);
    }
    const handleEditPlan = async () => {
        if (!modelData?.plan_name || !modelData?.deps_count || !modelData?.staff_count || !modelData?.region_count) {
            toast.error('Please fill all the fields.', {
                duration: 3000,
                description: 'make sure you have filled the required fields before saving.',
            });
            return;
        }
        try {
            const formData = new FormData();
            formData.append('body', JSON.stringify(modelData));
            await editPlan(formData);
            toast.success('Plan edited successfully.', {
                duration: 3000,
                description: 'Plan edited successfully.',
            });
            setPlanDialogOpen(false);
            setModelData(null);
        } catch (error) {
            toast.error('Failed to edit plan.', {
                duration: 3000,
                description: 'Failed to edit plan.',
            });
        }
    }

    const handleDeletePlan = async (plan: any) => {
        try {
            await deletePlan(plan._id);
            toast.success('Plan deleted successfully.', {
                duration: 3000,
                description: 'Plan deleted successfully.',
            });
        } catch (error) {
            toast.error('Failed to delete plan.', {
                duration: 3000,
                description: 'Failed to delete plan.',
            });
        }
    }

    const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        setModelData({ ...modelData, [type]: e.target.value });
    }

    return (
        <div className="p-5 pb-10">
            <div className="bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 rounded-lg flex items-center justify-between px-5">
                <div className="flex items-center gap-1">
                    <AlignStartVertical size={30} />
                    <div className="">
                        <h1 className="text-lg font-semibold leading-6">Business Plans</h1>
                        <h1 className="text-sm leading-5 text-slate-400">Manage your business plans here</h1>
                    </div>
                </div>
                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}
                    onClick={handleAddPlanClick}
                    className='bg-gradient-to-tr from-cyan-900/70 border border-cyan-950/70 hover:border-yellow-700/80 to-cyan-950/70 p-2 px-3 rounded-lg flex items-center gap-2 cursor-pointer hover:opacity-80'
                >
                    <Plus strokeWidth={3} size={18} />
                    <h1 className="text-sm font-semibold">Add Plan</h1>
                </motion.div>
            </div>
            <div className="mt-2 bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 rounded-lg min-h-[40dvh]">
                {loadingPlans ? (
                    <div className="w-full h-full flex items-center justify-center mt-10">
                        <LoaderSpin size={60} />
                    </div>
                ) : businessPlans?.length === 0 ? (
                    <div className="mt-2 flex items-center justify-center h-full">
                        <p className="text-sm text-slate-400">No plans added.</p>
                    </div>
                ) : (
                    <div className="w-full flex flex-wrap">
                        {businessPlans?.map((plan: any, index: number) => (
                            <div key={index} className="w-full lg:w-3/12 p-1">
                                <div className="bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-3 rounded-lg relative">
                                    <h1 className="font-semibold text-sm">{plan?.plan_name}</h1>
                                    <p className="text-sm text-slate-400">Departments: <span className='font-semibold text-slate-200'>{plan?.deps_count}</span></p>
                                    <p className="text-sm text-slate-400">Staff: <span className='font-semibold text-slate-200'>{plan?.staff_count}</span></p>
                                    <p className="text-sm text-slate-400">Regions: <span className='font-semibold text-slate-200'>{plan?.region_count}</span></p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.09 }} className='absolute top-2 right-2 cursor-pointer'>
                                                <EllipsisVertical size={20} />
                                            </motion.div>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                            <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }}
                                                    onClick={() => handleClickEditPlan(plan)}
                                                    className='bg-slate-800/50 w-full p-1 py-2 text-yellow-500 cursor-pointer hover:text-yellow-700 flex items-center justify-start gap-1'
                                                >
                                                    <PencilRuler size={16} />
                                                    <h1 className='text-xs font-semibold'>Edit</h1>
                                                </motion.div>
                                                <Popconfirm title="Are you sure to delete this plan?" onConfirm={() => handleDeletePlan(plan)}>
                                                    <div className='w-full'>
                                                        <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-start gap-1'>
                                                            <Trash size={16} />
                                                            <h1 className='text-xs font-semibold'>Delete</h1>
                                                        </motion.div>
                                                    </div>
                                                </Popconfirm>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                <DialogContent className='lg:w-[450px] px-3 border border-slate-700'>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit' : 'Add'} Plan</DialogTitle>
                        <DialogDescription>{isEdit ? 'Editing plan details will not reflected on assigned businesses.' : 'Newly added plans are shown on adding or editing business after that.'}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <div className="">
                            <Label className='text-xs font-semibold'>* Plan Name</Label>
                            <Input value={modelData?.plan_name} onChange={(e) => handleTypeChange(e, 'plan_name')} placeholder='plan name' />
                        </div>
                        <div className="">
                            <Label className='text-xs font-semibold'>* No. Departments</Label>
                            <Input value={modelData?.deps_count} onChange={(e) => handleTypeChange(e, 'deps_count')} placeholder='number of departments' />
                        </div>
                        <div className="">
                            <Label className='text-xs font-semibold'>* No. Staffs</Label>
                            <Input value={modelData?.staff_count} onChange={(e) => handleTypeChange(e, 'staff_count')} placeholder='number of staffs' />
                        </div>
                        <div className="">
                            <Label className='text-xs font-semibold'>* No. Regions</Label>
                            <Input value={modelData?.region_count} onChange={(e) => handleTypeChange(e, 'region_count')} placeholder='number of regions' />
                        </div>
                    </div>
                    <motion.div onClick={handlePlanSubmit} whileTap={{ scale: 0.98 }} className='bg-gradient-to-tr from-slate-900/70 to-slate-950/70 p-2 px-3 rounded-lg border border-slate-700 w-full flex items-center justify-center gap-2 mt-2 cursor-pointer hover:opacity-80'>
                        {addingNewPlan || editingPlan ? (
                            <>
                                <LoaderSpin size={20} />
                                <h1 className='text-sm font-semibold'>{isEdit ? 'Editing...' : 'Adding...'}</h1>
                            </>
                        ) : (<>{isEdit ? <PencilRuler size={20} /> : <Plus strokeWidth={3} size={20} />}
                            <h1 className='text-sm font-semibold'>{isEdit ? 'Edit' : 'Add'} Plan</h1></>)}
                    </motion.div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default BusinessPlans