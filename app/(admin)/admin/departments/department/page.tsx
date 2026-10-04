"use client"
import { useOrganizationOverview } from "@/hooks/use-organization-overview";
import OrganizationSectionControls from "@/components/admin/OrganizationSectionControls";
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { motion } from 'framer-motion';
import { Check, EllipsisVertical, Eye, Library, MapPinned, Plus, Trash2, UserPlus, Users, Users2 } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from '@/components/ui/breadcrumb'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Avatar } from 'antd';
import { useAddDepartmentArea, useAddDepartmentHead, useAddDepartmentRegion, useAddDepartmentStaff, useRemoveDepartmentArea, useRemoveDepartmentHead, useRemoveDepartmentRegion, useRemoveDepartmentStaff } from '@/query/business/queries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Popconfirm } from 'antd';

const DepartmentPage = () => {
    const router = useRouter();
    const { departmentData } = useSelector((state: RootState) => state.application);
    const overview = useOrganizationOverview("department", departmentData?._id, ["heads", "staffs", "regions", "areas", "available_regions", "available_areas", "available_staffs"]);
    const { businessData } = useSelector((state: RootState) => state.user);
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [currentSelectedStaff, setCurrentSelectedStaff] = useState<string>('');
    const allAreas = overview.section("available_areas").items;
    const [addHeadDialog, setAddHeadDialog] = useState(false);

    const { mutateAsync: addDepartmentHead, isPending: addingHead } = useAddDepartmentHead();
    const { mutateAsync: removeDepartmentHead } = useRemoveDepartmentHead();
    const { mutateAsync: addDepartmentRegion, isPending: addingRegion } = useAddDepartmentRegion();
    const { mutateAsync: removeDepartmentRegion } = useRemoveDepartmentRegion();
    const { mutateAsync: addDepartmentArea, isPending: addingArea } = useAddDepartmentArea();
    const { mutateAsync: removeDepartmentArea } = useRemoveDepartmentArea();
    const { mutateAsync: addDepartmentStaff, isPending: addingStaff } = useAddDepartmentStaff();
    const { mutateAsync: removeDepartmentStaff } = useRemoveDepartmentStaff();

    const heads = overview.section("heads").items;
    const regions = overview.section("regions").items;
    const areas = overview.section("areas").items;
    const staffs = overview.section("staffs").items;
    const filteredStaffs = overview.section("available_staffs").items;
    const filteredRegions = overview.section("available_regions").items;
    const filteredAreas = overview.section("available_areas").items;

    const handleGetCompleteDepData = async () => { await overview.refresh(); };

    const handleClickAddStaff = () => {
        setIsAddingStaff(true);
        setAddHeadDialog(true);
    }
    const handleClickAddHead = () => {
        setIsAddingStaff(false);
        setAddHeadDialog(true);
    }
    const handleAddHead = async () => {
        if (addingHead) return;
        if (!currentSelectedStaff) {
            return toast.error("Please select a staff.")
        }
        if(heads?.find((head: any) => head?.user_id?._id === currentSelectedStaff)) {
            return toast.error("Staff already added as a head.")
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            user_id: currentSelectedStaff,
            dep_id: departmentData?._id,
            business_id: businessData?._id
        }));
        const res = await addDepartmentHead(formData);
        if (res?.status == 200) {
            toast.success(res?.message);
            setAddHeadDialog(false);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to add head.");
        }
    }

    const handleRemoveHead = async (DepHeadId: string) => {
        const res = await removeDepartmentHead(DepHeadId);
        if (res?.status == 200) {
            toast.success(res?.message);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to remove head.");
        }
    }

    const handleAddStaff = async () => {
        if (addingStaff) return;
        if (!currentSelectedStaff) {
            return toast.error("Please select a staff.")
        }
        if(staffs?.find((staff: any) => staff?.staff_id?._id === currentSelectedStaff)) {
            return toast.error("Staff already added.")
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            user_id: currentSelectedStaff,
            dep_id: departmentData?._id,
            business_id: businessData?._id
        }));
        const res = await addDepartmentStaff(formData);
        if (res?.status == 200) {
            toast.success(res?.message);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to add staff.");
        }
        setAddHeadDialog(false);
        setIsAddingStaff(false);
        setCurrentSelectedStaff('');
    }

    const handleRemoveStaff = async (DepStaffId: string) => {
        const res = await removeDepartmentStaff(DepStaffId);
        if (res?.status == 200) {
            toast.success(res?.message);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to remove staff.");
        }
    }

    const [addRegionDialog, setAddRegionDialog] = useState(false);
    const [currentSelectedRegion, setCurrentSelectedRegion] = useState<string>('');

    const handleAddRegion = async () => {
        if (addingRegion) return;
        if (!currentSelectedRegion) {
            return toast.error("Please select a region.")
        }
        if(regions?.find((region: any) => region?.business_region_id?._id === currentSelectedRegion)) {
            return toast.error("Region already added.")
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            region_id: currentSelectedRegion,
            dep_id: departmentData?._id
        }));
        const res = await addDepartmentRegion(formData);
        if (res?.status == 200) {
            toast.success(res?.message);
            setAddRegionDialog(false);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to add region.");
        }
    }

    const handleRemoveRegion = async (DepRegionId: string) => {
        const res = await removeDepartmentRegion(DepRegionId);
        if (res?.status == 200) {
            toast.success(res?.message);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to remove region.");
        }
    }

    const [addAreaDialog, setAddAreaDialog] = useState(false);
    const [currentSelectedArea, setCurrentSelectedArea] = useState<string>('');

    const handleAddArea = async () => {
        if (addingArea) return;
        if (!currentSelectedArea) {
            return toast.error("Please select an area.")
        }
        if(areas?.find((area: any) => area?.area_id?._id === currentSelectedArea)) {
            return toast.error("Area already added.")
        }
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            area_id: currentSelectedArea,
            department_id: departmentData?._id,
            region_id: allAreas?.find((area: any) => area?._id === currentSelectedArea)?.region_id
        }));
        const res = await addDepartmentArea(formData);
        if (res?.status == 200) {
            toast.success(res?.message);
            setAddAreaDialog(false);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to add area.");
        }
    }

    const handleRemoveArea = async (DepAreaId: string) => {
        const res = await removeDepartmentArea(DepAreaId);
        if (res?.status == 200) {
            toast.success(res?.message);
            handleGetCompleteDepData();
        } else {
            toast.error(res?.message || "Failed to remove area.");
        }
    }

    return (
        <div className='p-4 pb-10'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()} className='pl-1 cursor-pointer'>Business Departments</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{departmentData?.dep_name || "Department"}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex justify-between bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg my-2">
                <h1 className='font-bold text-md flex gap-1 items-center'><Library size={18} /> {departmentData?.dep_name}</h1>
            </div>

            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg min-h-[20vh] mb-2">
                <div className="flex justify-between">
                    <h1 className='font-medium text-sm px-3 flex gap-1 items-center text-slate-400'><Users2 size={16} /> Department Heads</h1>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
                        onClick={() => handleClickAddHead()}
                    >
                        <UserPlus size={12} />
                        Add Head
                    </motion.div>
                </div>

                <OrganizationSectionControls key={`${overview.scope}:heads`} overview={overview} name="heads" label="heads" />
                {overview.section("heads").loaded && heads?.length === 0 && (
                    <div className='w-full h-[10vh] flex items-center justify-center'>
                        <h1 className='text-xs text-slate-400'>No head data found, you can add a new one.</h1>
                    </div>
                )}

                <div className="flex flex-wrap">
                    {heads?.map((head: any) => <div className="w-full lg:w-4/12 p-1" key={head?._id}>
                        <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg flex items-center gap-2 relative">
                            <Avatar src={head?.user_id?.avatar_url} size={35} />
                            <div>
                                <h1 className='font-medium text-sm text-slate-400'>{head?.user_id?.name}</h1>
                                <p className='font-medium text-xs text-slate-400'>{head?.user_id?.email}</p>
                            </div>
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
                                            <Popconfirm title="Are you sure to remove this head user?" onConfirm={() => handleRemoveHead(head?._id)}>
                                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Trash2 size={14} />
                                                    <h1 className='text-xs font-semibold'>Remove</h1>
                                                </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
                </div>
            </div>

            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg min-h-[20vh] mb-2">
                <div className="flex justify-between">
                    <h1 className='font-medium text-sm px-3 flex gap-1 items-center text-slate-400'><MapPinned size={16} /> Department Regions</h1>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
                        onClick={() => setAddRegionDialog(true)}
                    >
                        <Plus size={12} />
                        Add Region
                    </motion.div>
                </div>

                <OrganizationSectionControls key={`${overview.scope}:regions`} overview={overview} name="regions" label="regions" />
                {overview.section("regions").loaded && regions?.length === 0 && (
                    <div className='w-full h-[10vh] flex items-center justify-center'>
                        <h1 className='text-xs text-slate-400'>No region data found, you can add a new one.</h1>
                    </div>
                )}

                <div className="flex flex-wrap">
                    {regions?.map((region: any) => <div className="w-full lg:w-3/12 p-1" key={region?._id}>
                        <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg relative">
                            <h1 className='font-medium text-sm text-slate-200'>{region?.business_region_id?.region_name}</h1>
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
                                            <Popconfirm title="Are you sure to remove this region?" onConfirm={() => handleRemoveRegion(region?._id)}>
                                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Trash2 size={14} />
                                                    <h1 className='text-xs font-semibold'>Remove</h1>
                                                </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
                </div>
            </div>

            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg min-h-[20vh] mb-2">
                <div className="flex justify-between">
                    <h1 className='font-medium text-sm px-3 flex gap-1 items-center text-slate-400'><MapPinned size={16} /> Department Areas</h1>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
                        onClick={() => setAddAreaDialog(true)}
                    >
                        <Plus size={12} />
                        Add Area
                    </motion.div>
                </div>

                <OrganizationSectionControls key={`${overview.scope}:areas`} overview={overview} name="areas" label="areas" />
                {overview.section("areas").loaded && areas?.length === 0 && (
                    <div className='w-full h-[10vh] flex items-center justify-center'>
                        <h1 className='text-xs text-slate-400'>No area data found, you can add a new one.</h1>
                    </div>
                )}

                <div className="flex flex-wrap">
                    {areas?.map((area: any) => <div className="w-full lg:w-3/12 p-1" key={area?._id}>
                        <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg relative">
                            <h1 className='font-medium text-sm text-slate-200'>{area?.area_id?.area_name}</h1>
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
                                            <Popconfirm title="Are you sure to remove this area?" onConfirm={() => handleRemoveArea(area?._id)}>
                                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Trash2 size={14} />
                                                    <h1 className='text-xs font-semibold'>Remove</h1>
                                                </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
                </div>
            </div>

            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg min-h-[20vh] mb-2">
                <div className="flex justify-between">
                    <h1 className='font-medium text-sm px-3 flex gap-1 items-center text-slate-400'><Users size={16} /> Department Staffs</h1>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
                        onClick={handleClickAddStaff}
                    >
                        <UserPlus size={12} />
                        Add Staff
                    </motion.div>
                </div>

                <OrganizationSectionControls key={`${overview.scope}:staffs`} overview={overview} name="staffs" label="staffs" />
                {overview.section("staffs").loaded && staffs?.length === 0 && (
                    <div className='w-full h-[10vh] flex items-center justify-center'>
                        <h1 className='text-xs text-slate-400'>No staffs data found, you can add a new one.</h1>
                    </div>
                )}

                <div className="flex flex-wrap">
                    {staffs?.map((staff: any) => <div className="w-full lg:w-3/12 p-1" key={staff?._id}>
                        <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-700 p-3 rounded-lg relative">
                            <div className="flex items-center gap-2">
                                <Avatar size={35} src={staff?.staff_id?.avatar_url} />
                                <div>
                                    <h1 className='font-medium text-sm text-slate-300'>{staff?.staff_id?.name}</h1>
                                    <p className='text-xs text-slate-400'>{staff?.staff_id?.email}</p>
                                </div>
                            </div>
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
                                            <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>Profile</h1>
                                            </motion.div>
                                            <Popconfirm title="Are you sure to remove this staff?" onConfirm={() => handleRemoveStaff(staff?._id)}>
                                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Trash2 size={14} />
                                                    <h1 className='text-xs font-semibold'>Remove</h1>
                                                </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
                </div>

            </div>

            {/* Add Department Head */}
            <Dialog open={addHeadDialog} onOpenChange={setAddHeadDialog}>
                <DialogContent className="lg:w-[450px] max-h-[70vh] flex flex-col border-slate-800 bg-black/10 backdrop-blur-sm">
                    <DialogHeader>
                        <DialogTitle>Add Department {isAddingStaff ? "Staff" : "Head"}</DialogTitle>
                        <DialogDescription>You can add any business staff as department {isAddingStaff ? "staff" : "head"} for {departmentData?.dep_name}.</DialogDescription>
                    </DialogHeader>
                    <OrganizationSectionControls key={`${overview.scope}:available_staffs`} overview={overview} name="available_staffs" label="staff" />
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {overview.section("available_staffs").loaded && filteredStaffs?.length === 0 && (
                            <div className="flex items-center justify-center h-[10vh]">
                                <h1 className="text-xs font-medium text-slate-300">No matching staff.</h1>
                            </div>
                        )}
                        {filteredStaffs?.map((staff: any) => (
                            <motion.div
                                key={staff?._id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setCurrentSelectedStaff(staff?.user_id?._id)}
                                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
                                <div className="flex items-center gap-2">
                                    <Avatar size={30} src={staff?.user_id?.avatar_url} />
                                    <div className="flex flex-col">
                                        <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{staff?.user_id?.name}</h1>
                                        <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                                    </div>
                                </div>
                                {currentSelectedStaff === staff?.user_id?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
                            </motion.div>
                        ))}
                    </div>
                    <DialogFooter className="w-full">
                        <div className="pt-2 bg-slate-950/80 w-full">
                            <motion.button type="button" disabled={addingHead || addingStaff}
                                whileTap={{ scale: 0.98 }}
                                onClick={isAddingStaff ? handleAddStaff : handleAddHead}
                                className="w-full bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
                                <Plus size={16} />
                                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add Department {isAddingStaff ? "Staff" : "Head"}</h1>
                            </motion.button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Department Region */}
            <Dialog open={addRegionDialog} onOpenChange={setAddRegionDialog}>
                <DialogContent className="lg:w-[450px] max-h-[70vh] flex flex-col border-slate-800 bg-black/10 backdrop-blur-sm">
                    <DialogHeader>
                        <DialogTitle>Add Department Region</DialogTitle>
                        <DialogDescription>Select the business regions for {departmentData?.dep_name}.</DialogDescription>
                    </DialogHeader>
                    <OrganizationSectionControls key={`${overview.scope}:available_regions`} overview={overview} name="available_regions" label="regions" />
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {overview.section("available_regions").loaded && filteredRegions?.length === 0 && (
                            <div className="flex items-center justify-center h-[10vh]">
                                <h1 className="text-xs font-medium text-slate-300">No matching regions.</h1>
                            </div>
                        )}
                        {filteredRegions?.map((region: any) => (
                            <motion.div
                                key={region?._id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setCurrentSelectedRegion(region?._id)}
                                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
                                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{region?.region_name}</h1>
                                {currentSelectedRegion === region?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
                            </motion.div>
                        ))}
                    </div>
                    <DialogFooter className="w-full">
                        <div className="pt-2 bg-slate-950/80 w-full">
                            <motion.button type="button" disabled={addingRegion}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAddRegion}
                                className="w-full bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
                                <Plus size={16} />
                                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add Department Region</h1>
                            </motion.button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Department Region */}
            <Dialog open={addAreaDialog} onOpenChange={setAddAreaDialog}>
                <DialogContent className="lg:w-[450px] max-h-[70vh] flex flex-col border-slate-800 bg-black/10 backdrop-blur-sm">
                    <DialogHeader>
                        <DialogTitle>Add Department Area</DialogTitle>
                        <DialogDescription>Select the business areas for {departmentData?.dep_name}.</DialogDescription>
                    </DialogHeader>
                    <OrganizationSectionControls key={`${overview.scope}:available_areas`} overview={overview} name="available_areas" label="areas" />
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {overview.section("available_areas").loaded && filteredAreas?.length === 0 && (
                            <div className="flex items-center justify-center h-[10vh]">
                                <h1 className="text-xs font-medium text-slate-300">No areas in the assigned regions match this search.</h1>
                            </div>
                        )}
                        {filteredAreas?.map((area: any) => (
                            <motion.div
                                key={area?._id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setCurrentSelectedArea(area?._id)}
                                className="bg-gradient-to-tr from-slate-800/60 to-slate-900/60 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg mb-1.5 relative">
                                <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">{area?.area_name}</h1>
                                {currentSelectedArea === area?._id && <div className="absolute right-2 top-1.5"><Check className="text-cyan-600" strokeWidth={3} size={17} /> </div>}
                            </motion.div>
                        ))}
                    </div>
                    <DialogFooter className="w-full">
                        <div className="pt-2 bg-slate-950/80 w-full">
                            <motion.button type="button" disabled={addingArea}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAddArea}
                                className="w-full bg-gradient-to-tr from-slate-700/50 to-slate-800/50 p-3 hover:border-cyan-500 border border-slate-700 select-none cursor-pointer rounded-lg flex items-center gap-1 justify-center">
                                <Plus size={16} />
                                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">Add Department Area</h1>
                            </motion.button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default DepartmentPage
