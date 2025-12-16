"use client"
import React, { useEffect, useState } from 'react';
import { HandPlatter, Plus, Pyramid, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EllipsisVertical } from 'lucide-react';
import { Popconfirm } from 'antd';
import { useAddBusinessSkill, useGetBusinessSkills, useRemoveBusinessSkill } from '@/query/business/queries';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"  
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import LoaderSpin from '@/components/shared/LoaderSpin';

const SkillsPage = () => {
    const { businessData } = useSelector((state: RootState) => state.user)
    const [businessSkills, setBusinessSkills] = useState<any[]>([]);
    const { mutateAsync: getSkills, isPending: loadingSkills } = useGetBusinessSkills();
    const { mutateAsync: addSkill } = useAddBusinessSkill();
    const { mutateAsync: removeSkill } = useRemoveBusinessSkill();
    const [openAddSkill, setOpenAddSkill] = useState(false);
    const [skillName, setSkillName] = useState('');

    const handleGetSkills = async () => {
        const res = await getSkills(businessData?._id);
        if (res?.status === 200) {
            setBusinessSkills(res?.data);
        }
    }

    const handleAddSkill = async () => {
        if(!skillName) {
            toast.error("Skill Name Required")
            return;
        }
        if(businessSkills?.find((skill: any) => skill.skill_name === skillName)) {
            toast.error("Skill already exists")
            return;
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            skill_name: skillName,
            business_id: businessData?._id
        }))
        const res = await addSkill(formData);
        if (res?.status === 200) {
            toast.success("Skill added successfully.");
            handleGetSkills();
            setOpenAddSkill(false);
            setSkillName('');
        }
    }

    const handleRemoveSkill = async (BSkillId: string) => {
        const res = await removeSkill(BSkillId);
        if (res?.status === 200) {
            toast.success("Skill removed successfully.");
            handleGetSkills();
        }
    }

    useEffect(() => {
        handleGetSkills();
    }, []);

    return (
        <div className={`p-4 pb-10`}>
            <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg flex items-center justify-between mb-2">
                <h1 className='font-semibold text-sm text-slate-300 flex items-center gap-1'><HandPlatter size={16} /> Skills Management</h1>
                <motion.div 
                    whileTap={{ scale: 0.9 }} 
                    whileHover={{ scale: 1.03 }} 
                    className='flex items-center gap-1 cursor-pointer bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-2 px-4 rounded-lg border border-slate-700 hover:border-cyan-600 group' 
                    onClick={() => setOpenAddSkill(true)}
                >
                    <Plus size={16} className='group-hover:text-cyan-600' />
                    <h1 className='text-xs text-slate-300'>Add Skill</h1>
                </motion.div>
            </div>
            <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg min-h-[30vh]">
                <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'><Pyramid size={14} /> Added Skills</h1>
                {(!loadingSkills && businessSkills?.length === 0) && (
                    <div className='flex items-center justify-center h-[15vh]'>
                        <h1 className='text-xs text-slate-300'>No Skills Added.</h1>
                    </div>
                )}
                {loadingSkills && (
                    <div className='flex items-center justify-center h-[20vh]'>
                        <LoaderSpin size={50} />
                    </div>
                )}
                <div className="flex flex-wrap">
                    {businessSkills?.map((skill: any) => (
                        <div className="w-full lg:w-3/12 p-1" key={skill?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg border border-slate-800 hover:border-cyan-700 relative">
                            <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'>{skill?.skill_name}</h1>
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
                                            <Popconfirm title="Are you sure to delete this role?" onConfirm={() => handleRemoveSkill(skill?._id)}>
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
                    </div>
                ))}
                </div>
            </div>

            {/* Add Skill Dialog */}
            <Dialog open={openAddSkill} onOpenChange={setOpenAddSkill}>
                <DialogContent className='lg:w-[450px]'>
                    <DialogHeader>
                        <DialogTitle>Add Business Skill</DialogTitle>
                        <DialogDescription>Skills will be visible for assigning to the staffs.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        <Label className='text-xs text-slate-300'>Skill Name</Label>
                        <Input placeholder="Enter skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.03, y: -2 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-2 px-4 rounded-lg border border-slate-800 hover:border-cyan-600 group' onClick={handleAddSkill}>
                            <Plus size={16} className='group-hover:text-cyan-600' />
                            <h1 className='text-xs text-slate-300'>Add Skill</h1>
                        </motion.div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default SkillsPage;
