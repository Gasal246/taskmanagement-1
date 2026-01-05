"use client"
import React, { useEffect, useState } from 'react';
import { HandPlatter, Plus, Pyramid, Trash2, Users, PencilRuler, EllipsisVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Popconfirm } from 'antd';
import { useAddBusinessSkill, useGetBusinessSkills, useGetBusinessStaffsBySkill, useRemoveBusinessSkill, useUpdateBusinessSkill } from '@/query/business/queries';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { loadAdminBusinessStaff } from '@/redux/slices/application';

const SkillsPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { businessData } = useSelector((state: RootState) => state.user)
    const [businessSkills, setBusinessSkills] = useState<any[]>([]);
    const { mutateAsync: getSkills, isPending: loadingSkills } = useGetBusinessSkills();
    const { mutateAsync: addSkill } = useAddBusinessSkill();
    const { mutateAsync: removeSkill } = useRemoveBusinessSkill();
    const { mutateAsync: updateSkill, isPending: updatingSkill } = useUpdateBusinessSkill();
    const { mutateAsync: getStaffsBySkill, isPending: loadingStaffs } = useGetBusinessStaffsBySkill();
    const [openAddSkill, setOpenAddSkill] = useState(false);
    const [openEditSkill, setOpenEditSkill] = useState(false);
    const [skillName, setSkillName] = useState('');
    const [editSkillName, setEditSkillName] = useState('');
    const [editingSkill, setEditingSkill] = useState<any | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<any | null>(null);
    const [skillStaffs, setSkillStaffs] = useState<any[]>([]);
    const [staffSearch, setStaffSearch] = useState('');

    const handleGetSkills = async () => {
        const res = await getSkills(businessData?._id);
        if (res?.status === 200) {
            setBusinessSkills(res?.data);
        }
    }

    const handleAddSkill = async () => {
        if (!skillName) {
            toast.error("Skill Name Required")
            return;
        }
        if (businessSkills?.find((skill: any) => skill.skill_name === skillName)) {
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

    const handleEditClick = (skill: any) => {
        setEditingSkill(skill);
        setEditSkillName(skill?.skill_name || '');
        setOpenEditSkill(true);
    }

    const handleUpdateSkill = async () => {
        const trimmedName = editSkillName.trim();
        if (!editingSkill?._id) {
            toast.error("Select a skill to edit");
            return;
        }
        if (!trimmedName) {
            toast.error("Skill Name Required");
            return;
        }
        const duplicate = businessSkills?.find((skill: any) =>
            skill?._id !== editingSkill?._id &&
            (skill?.skill_name || "").toLowerCase() === trimmedName.toLowerCase()
        );
        if (duplicate) {
            toast.error("Skill already exists");
            return;
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            skill_id: editingSkill?._id,
            skill_name: trimmedName,
            business_id: businessData?._id
        }));
        const res = await updateSkill(formData);
        if (res?.status === 200) {
            toast.success("Skill updated successfully.");
            handleGetSkills();
            setOpenEditSkill(false);
            setEditSkillName('');
            setEditingSkill(null);
        }
    }

    const handleViewStaffs = async (skill: any) => {
        setSelectedSkill(skill);
        setIsStaffSheetOpen(true);
        setSkillStaffs([]);
        setStaffSearch('');
        if (!businessData?._id || !skill?._id) {
            return;
        }
        const res = await getStaffsBySkill({ business_id: businessData?._id, skill_id: skill?._id });
        if (res?.status === 200) {
            setSkillStaffs(res?.data || []);
        } else {
            toast.error(res?.error || "Failed to fetch staffs");
        }
    }

    const normalizedSearch = searchValue.trim().toLowerCase();
    const visibleSkills = normalizedSearch
        ? businessSkills.filter((skill: any) =>
            (skill?.skill_name || "").toLowerCase().includes(normalizedSearch)
        )
        : businessSkills;

    const normalizedStaffSearch = staffSearch.trim().toLowerCase();
    const visibleStaffs = normalizedStaffSearch
        ? skillStaffs.filter((staff: any) => {
            const user = staff?.user_id || {};
            const name = user?.name || "";
            const email = user?.email || "";
            const phone = user?.phone || "";
            return `${name} ${email} ${phone}`.toLowerCase().includes(normalizedStaffSearch);
        })
        : skillStaffs;

    useEffect(() => {
        handleGetSkills();
    }, []);

    const handleViewStaff = async (user: any) => {
        await dispatch(loadAdminBusinessStaff(user));
        router.push(`/admin/staffs/view-staff`);
    }

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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h1 className='font-medium text-xs text-slate-300 flex items-center gap-1'><Pyramid size={14} /> Added Skills</h1>
                    <Input
                        placeholder="Search skills"
                        type="search"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full sm:w-[260px]"
                    />
                </div>
                {(!loadingSkills && visibleSkills?.length === 0) && (
                    <div className='flex items-center justify-center h-[15vh]'>
                        <h1 className='text-xs text-slate-300'>{normalizedSearch ? "No matching skills found." : "No Skills Added."}</h1>
                    </div>
                )}
                {loadingSkills && (
                    <div className='flex items-center justify-center h-[20vh]'>
                        <LoaderSpin size={50} />
                    </div>
                )}
                <div className="flex flex-wrap">
                    {visibleSkills?.map((skill: any) => (
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
                                    <PopoverContent className='w-[140px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                        <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                            <div className='w-full p-0.5 space-y-1'>
                                                <motion.div onClick={() => handleViewStaffs(skill)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Users size={14} />
                                                    <h1 className='text-xs font-semibold'>View Staffs</h1>
                                                </motion.div>
                                                <Popconfirm title="Are you sure to delete this skill?" onConfirm={() => handleRemoveSkill(skill?._id)}>
                                                    <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                        <Trash2 size={14} />
                                                        <h1 className='text-xs font-semibold'>Delete</h1>
                                                    </motion.div>
                                                </Popconfirm>
                                                <motion.div onClick={() => handleEditClick(skill)} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-purple-500 cursor-pointer hover:text-purple-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <PencilRuler size={14} />
                                                    <h1 className='text-xs font-semibold'>Edit</h1>
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

            {/* Edit Skill Dialog */}
            <Dialog
                open={openEditSkill}
                onOpenChange={(open) => {
                    setOpenEditSkill(open);
                    if (!open) {
                        setEditingSkill(null);
                        setEditSkillName('');
                    }
                }}
            >
                <DialogContent className='lg:w-[450px]'>
                    <DialogHeader>
                        <DialogTitle>Edit Skill</DialogTitle>
                        <DialogDescription>Update the selected skill name.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        <Label className='text-xs text-slate-300'>Skill Name</Label>
                        <Input placeholder="Enter skill name" value={editSkillName} onChange={(e) => setEditSkillName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.03, y: -2 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-2 px-4 rounded-lg border border-slate-800 hover:border-cyan-600 group' onClick={handleUpdateSkill}>
                            <PencilRuler size={16} className='group-hover:text-cyan-600' />
                            <h1 className='text-xs text-slate-300'>{updatingSkill ? "Updating..." : "Update Skill"}</h1>
                        </motion.div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Staffs Sheet */}
            <Sheet
                open={isStaffSheetOpen}
                onOpenChange={(open) => {
                    setIsStaffSheetOpen(open);
                    if (!open) {
                        setSelectedSkill(null);
                        setSkillStaffs([]);
                        setStaffSearch('');
                    }
                }}
            >
                <SheetContent className='min-w-full lg:min-w-[600px] border-cyan-900 px-2'>
                    <SheetHeader className='p-2'>
                        <SheetTitle>
                            <div>
                                <h1 className='font-medium text-xl text-slate-300'>{selectedSkill?.skill_name || "Selected Skill"}</h1>
                                <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1'>Assigned Staffs</h1>
                            </div>
                        </SheetTitle>
                        <SheetDescription>Staffs assigned with this skill are listed below.</SheetDescription>
                    </SheetHeader>
                    <div className='p-4 w-full h-[calc(100vh-200px)] overflow-y-scroll border-2 border-dashed rounded-lg border-slate-800'>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h1 className='font-medium text-xs text-slate-400 flex items-center gap-1'><Users size={14} /> Assigned Staffs</h1>
                            <Input
                                placeholder="Search staffs"
                                type="search"
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                className="border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full sm:w-[260px]"
                            />
                        </div>
                        {loadingStaffs && (
                            <div className='flex items-center justify-center h-[20vh]'>
                                <LoaderSpin size={50} />
                            </div>
                        )}
                        {!loadingStaffs && visibleStaffs?.length === 0 && (
                            <div className='flex items-center justify-center h-[20vh]'>
                                <h1 className='text-xs text-slate-300'>{normalizedStaffSearch ? "No matching staffs found." : "No staffs assigned."}</h1>
                            </div>
                        )}
                        {!loadingStaffs && visibleStaffs?.length > 0 && (
                            <div className="flex flex-wrap">
                                {visibleStaffs.map((staff: any) => (
                                    <div className="w-full p-1" key={staff?._id} onClick={() => handleViewStaff(staff?.user_id)}>
                                        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 px-3 rounded-lg border border-slate-800 hover:border-cyan-700 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <h1 className='font-medium text-sm text-slate-300'>{staff?.user_id?.name || "Unknown Staff"}</h1>
                                                <p className='text-xs text-slate-400'>{staff?.user_id?.email || staff?.user_id?.phone || "-"}</p>
                                            </div>
                                            <h1 className={`text-[10px] font-semibold ${staff?.user_id?.status === 1 ? 'text-green-600' : 'text-red-600'}`}>
                                                {staff?.user_id?.status === 1 ? "Active" : "Blocked"}
                                            </h1>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
};

export default SkillsPage;
