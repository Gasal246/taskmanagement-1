"use client"
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Check, CircleCheckBig, Earth, EllipsisVertical, Eye, InfoIcon, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { useAddRegionArea, useAddRegionDepartment, useAddRegionHead, useAddRegionStaff, useGetRegionComplete, useRemoveRegionArea, useRemoveRegionDepartment, useRemoveRegionHead, useRemoveRegionStaff } from '@/query/business/queries';
import { useGetBusinessStaffs } from '@/query/user/queries';
import { toast } from 'sonner';
import { Avatar, Popconfirm } from 'antd';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import LoaderSpin from '@/components/shared/LoaderSpin';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { AppDispatch } from '@/redux/store';
import { loadAreaData, loadDepartmentData } from '@/redux/slices/application';

const RegionPage = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { regionData } = useSelector((state: RootState) => state.application);

    const { mutateAsync: removeArea } = useRemoveRegionArea();
    const { mutateAsync: addArea, isPending: addingArea } = useAddRegionArea();
    
    const [areas, setAreas] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [staffs, setStaffs] = useState<any[]>([]);
    const [heads, setHeads] = useState<any[]>([]);
    const [openAddAreaDialog, setOpenAddAreaDialog] = useState<boolean>(false);
    const [areaName, setAreaName] = useState<string>("");
    
    const { mutateAsync: fetchCompleteRegion, isPending: loadingCompleteRegion } = useGetRegionComplete()
    const { mutateAsync: addHead, isPending: addingHead } = useAddRegionHead();
    const { mutateAsync: removeHead } = useRemoveRegionHead();

    useEffect(() => {
        if(regionData) {
            fetchRegionData();
        } else {
            router.push('/admin');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [regionData]);

    const fetchRegionData = async () => {
        if(!regionData?._id) {
            router.push('/admin');
            return toast("Region not detected.");
        }
        const res = await fetchCompleteRegion(regionData?._id);
        // console.log("res", res);
        if(res?.status === 200) {
            setAreas(res?.data?.areas);
            setDepartments(res?.data?.departments);
            setStaffs(res?.data?.staffs);
            setHeads(res?.data?.heads);
        }
    }

    const handleAddArea = async () => {
        if(addingArea) return;
        if(!areaName) {
            return toast("Area name not entered.");
        }
        if(areas?.find((area: any) => area.area_name === areaName)) {
            return toast("Area already exists.");
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            area_name: areaName,
            region_id: regionData?._id,
            business_id: regionData?.business_id
        }));
        const res = await addArea(formData);
        if(res?.status === 200) {
            setOpenAddAreaDialog(false);
            setAreaName("");
            fetchRegionData();
        }
    }

    const handleRemoveArea = async (id: string) => {
        const res = await removeArea(id);
        if(res?.status === 200) {
            fetchRegionData();
        }
    }

    const handleViewArea = (data: any) => {
        dispatch(loadAreaData(data));
        router.push(`/admin/regions/area`);
    }

    const [addHeadOpen, setAddHeadOpen] = React.useState<boolean>(false);
    const [selectedUser, setSelectedUser] = React.useState<string>("");
    const [headSearch, setHeadSearch] = React.useState<string>("");
    const [staffSearch, setStaffSearch] = React.useState<string>("");

    const handleAddRegionHead = async () => {
        if(addingHead) return;
        if(!selectedUser) {
            return toast.error("User not selected.");
        }
        if(heads?.find((head: any) => head?.user_id === selectedUser)) {
            return toast.error("Already Head of the region.", {
                description: "Selected user is already head of the region."
            });
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            region_id: regionData?._id,
            business_id: regionData?.business_id
        }));
        const res = await addHead(formData);
        if(res?.status === 200) {
            setAddHeadOpen(false);
            setSelectedUser("");
            fetchRegionData();
        }
    };

    const handleRemoveRegionHead = async (id: string) => {
        const res = await removeHead(id);
        if(res?.status === 200) {
            fetchRegionData();
        }
    }

    const [openAddDepartment, setOpenAddDepartment] = useState<boolean>(false);
    const [departmentName, setDepartmentName] = useState<string>("");
    const [departmentType, setDepartmentType] = useState<string>("");
    const { mutateAsync: addDepartment, isPending: addingDepartment } = useAddRegionDepartment();

    const handleAddDepartment = async () => {
        if(addingDepartment) return;
        if(!departmentName) {
            return toast("Department name not entered.");
        }
        if(departments?.find((department: any) => department.dep_name === departmentName)) {
            return toast("Department already exists.");
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            dep_name: departmentName,
            type: departmentType,
            region_id: regionData?._id
        }));
        const res = await addDepartment(formData);
        if(res?.status === 200) {
            setOpenAddDepartment(false);
            setDepartmentName("");
            fetchRegionData();
        }
    }

    const handleViewDep = (data: any) => {
        dispatch(loadDepartmentData(data));
        router.push('/admin/regions/department');
    }


    const [openAddStaffDialog, setOpenAddStaffDialog] = useState<boolean>(false);
    const { data: businessStaffs, isLoading: loadingBusinessStaffs } = useGetBusinessStaffs(regionData?.business_id);
    const { mutateAsync: addStaff, isPending: addingStaff } = useAddRegionStaff();

    const headSearchTerm = headSearch.trim().toLowerCase();
    const filteredHeadStaffs = businessStaffs?.filter((staff: any) => {
        const name = staff?.user_id?.name || "";
        return name.toLowerCase().includes(headSearchTerm);
    });
    const staffSearchTerm = staffSearch.trim().toLowerCase();
    const filteredStaffs = businessStaffs?.filter((staff: any) => {
        const name = staff?.user_id?.name || "";
        const email = staff?.user_id?.email || "";
        return `${name} ${email}`.toLowerCase().includes(staffSearchTerm);
    });

    const handleAddRegionStaff = async () => {
        if(addingStaff) return;
        if(!selectedUser) {
            return toast.error("User not selected.");
        }
        if(staffs?.find((staff: any) => staff?.user_id === selectedUser)) {
            return toast.error("Already Staff of the region.", {
                description: "Selected user is already staff of the region."
            });
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            region_id: regionData?._id
        }));
        const res = await addStaff(formData);
        if(res?.status === 200) {
            setOpenAddStaffDialog(false);
            setSelectedUser("");
            fetchRegionData();
        }
    };

    const { mutateAsync: removeStaff } = useRemoveRegionStaff();

    const handleRemoveStaff = async (id: string) => {
        const res = await removeStaff(id);
        if(res?.status === 200) {
            fetchRegionData();
        }
    }

    return (
        <div className='p-4 overflow-y-scroll h-full pb-20'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Manage Regions</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{regionData?.region_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            
            <div className="bg-gradient-to-tr from-slate-950/70 to-slate-800/70 p-3 px-4 rounded-lg mt-2 ">
                <h1 className="text-md font-medium text-slate-200 flex items-center gap-1"><Earth size={20} /> {regionData?.region_name}</h1>
                <p className="text-xs font-medium text-slate-400 pl-5">Manage the departments, areas and staffs of this region</p>
            </div>

            <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg mt-2 min-h-[20vh] border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-medium text-slate-300 flex items-center gap-1"><InfoIcon size={14} />Region Head Details</h1>
                        <p className="text-xs font-medium text-slate-400">Region heads of {regionData?.region_name} are allowed to manage the areas and staffs of this region.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        className='p-2 bg-gradient-to-br from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-xs font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600'
                        onClick={() => setAddHeadOpen(true)}
                    >
                        <Plus size={18} /> Add Head
                    </motion.div>
                </div>
                {heads?.length === 0 && (
                    <div className="flex items-center justify-center h-[10vh]">
                        <h1 className="text-xs font-medium text-slate-300">No region heads added.</h1>
                    </div>
                )}
                {loadingCompleteRegion && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {heads?.map((head: any) => <div key={head?._id} className="w-full lg:w-4/12 p-1">
                        <div className="flex items-center gap-2 p-2 bg-gradient-to-tr from-slate-950/60 to-slate-800/60 rounded-lg border border-slate-700 hover:border-cyan-600 relative">
                            <Avatar src={head?.user?.avatar_url || '/avatar.png'} size={40} />
                            <div>
                                <h1 className="text-sm font-medium text-slate-200">{head?.user?.name}</h1>
                                <p className="text-xs text-slate-400">{head?.user?.email}</p>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        whileHover={{ scale: 1.02 }}
                                        className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                                    >
                                        <EllipsisVertical size={18} />
                                    </motion.div>
                                </PopoverTrigger>
                                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                        <div className='w-full p-0.5 space-y-1'>
                                            <motion.div
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => { }}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>Profile</h1>
                                            </motion.div>
                                            <Popconfirm title="Confirm to remove this region head ?" onConfirm={() => handleRemoveRegionHead(head?._id)}>
                                                <motion.div
                                                    whileTap={{ scale: 0.98 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => { }}
                                                    className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                    <Trash2 size={14} />
                                                    <h1 className='text-xs font-semibold'>Remove</h1>
                                                </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>)}
                </div>
            </div>


            <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg mt-2 min-h-[25vh] border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-medium text-slate-300 flex items-center gap-1"><InfoIcon size={14} />{regionData?.region_name} - Departments</h1>
                        <p className="text-xs font-medium text-slate-400 lg:w-2/3">Each Departments will have its own department head who can manage the department and sub departments within the department{`${departments?.length > 0 && ', view the department to manage'}`}.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        className='p-2 bg-gradient-to-br from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-xs font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600'
                        onClick={() => setOpenAddDepartment(true)}
                    >
                        <Plus size={18} /> Add Department
                    </motion.div>
                </div>
                {!loadingCompleteRegion && departments?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No departments added.</h1>
                    </div>
                )}
                {loadingCompleteRegion && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {departments?.map((dep: any) => (
                        <div className="w-full lg:w-3/12 p-1" key={dep?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg relative border border-slate-700 hover:border-cyan-600 ">
                            <div>
                            <h1 className="text-sm font-medium text-slate-200">{dep?.dep_name}</h1>
                            <p className="text-xs font-medium text-slate-400 capitalize"> Type: <span className="text-cyan-600">{dep?.type}</span></p>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        whileHover={{ scale: 1.02 }}
                                        className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                                    >
                                        <EllipsisVertical size={18} />
                                    </motion.div>
                                </PopoverTrigger>
                                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                        <div className='w-full p-0.5 space-y-1'>
                                            <motion.div
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => handleViewDep(dep)}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>View</h1>
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


            <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg mt-2 min-h-[25vh] border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-medium text-slate-300 flex items-center gap-1"><InfoIcon size={14} /> {regionData?.region_name} - Areas</h1>
                        <p className="text-xs font-medium text-slate-400 lg:w-2/3">The areas under the region are managed by region admins and each area will have its own area head who can manage the area and sub areas within the area{`${areas?.length > 0 && ', view the area to manage'}`}</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        className='p-2 bg-gradient-to-br from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-xs font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600'
                        onClick={() => setOpenAddAreaDialog(true)}
                    >
                        <Plus size={18} /> Add Area
                    </motion.div>
                </div>
                {!loadingCompleteRegion && areas?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No areas added.</h1>
                    </div>
                )}
                {loadingCompleteRegion && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {areas?.map((area: any) => (
                        <div className="w-full lg:w-3/12 p-1" key={area?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg relative border border-slate-700 hover:border-cyan-600 ">
                            <h1 className="text-sm font-medium text-slate-200">{area?.area_name}</h1>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        whileHover={{ scale: 1.02 }}
                                        className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                                    >
                                        <EllipsisVertical size={18} />
                                    </motion.div>
                                </PopoverTrigger>
                                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                        <div className='w-full p-0.5 space-y-1'>
                                            <motion.div
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => handleViewArea(area)}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>View</h1>
                                            </motion.div>
                                            <Popconfirm title="Confirm to remove this area ?" onConfirm={() => handleRemoveArea(area?._id)}>
                                                <motion.div
                                                    whileTap={{ scale: 0.98 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
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

            <div className="bg-gradient-to-tr from-slate-800/60 to-slate-950/60 p-2 px-4 rounded-lg mt-2 min-h-[25vh] border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-medium text-slate-300 flex items-center gap-1"><InfoIcon size={14} /> {regionData?.region_name} - Staffs</h1>
                        <p className="text-xs font-medium text-slate-400">The staffs of this region are managed by the region heads of {regionData?.region_name}.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        className='p-2 bg-gradient-to-br from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-xs font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600'
                        onClick={() => setOpenAddStaffDialog(true)}
                    >
                        <Plus size={18} /> Add Staff
                    </motion.div>
                </div>
                {!loadingCompleteRegion && staffs?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No staffs added.</h1>
                    </div>
                )}
                {loadingCompleteRegion && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {staffs?.map((staff: any) => <div className="w-full lg:w-3/12 p-1" key={staff?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-800/60 p-2 px-4 rounded-lg relative border border-slate-700 hover:border-cyan-600 flex items-center gap-1">
                            <Avatar src={staff?.user?.avatar_url || '/avatar.png'} size={30} />
                            <div>
                                <h1 className="text-xs font-medium text-slate-200">{staff?.user?.name}</h1>
                                <p className="text-xs text-slate-400">{staff?.user?.email}</p>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        whileHover={{ scale: 1.02 }}
                                        className='absolute right-2 top-1 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                                    >
                                        <EllipsisVertical size={18} />
                                    </motion.div>
                                </PopoverTrigger>
                                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                                    <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                                        <div className='w-full p-0.5 space-y-1'>
                                            <motion.div
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => { }}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>Profile</h1>
                                            </motion.div>
                                            <Popconfirm title="Confirm to remove this region head ?" onConfirm={() => { }}>
                                            <motion.div
                                                whileTap={{ scale: 0.98 }}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => handleRemoveStaff(staff?._id)}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Trash2 size={14} />
                                                <h1 className='text-xs font-semibold'>Remove</h1>
                                            </motion.div>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>)}
                </div>
            </div>
            
            {/* Add Area Dialog */}
            <Dialog open={openAddAreaDialog} onOpenChange={setOpenAddAreaDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Business Area</DialogTitle>
                        <DialogDescription>Adding areas under region - {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        <Input placeholder="Area Name" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
                            onClick={handleAddArea}
                        >
                            <CircleCheckBig className="group-hover:text-cyan-600" size={18} /> Add Area
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Head Dialog */}
            <Dialog open={addHeadOpen} onOpenChange={setAddHeadOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add Region Head</DialogTitle>
                        <DialogDescription>Adding region head under region - {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            placeholder="Search staff by name"
                            value={headSearch}
                            onChange={(e) => setHeadSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {!loadingBusinessStaffs && filteredHeadStaffs?.length === 0 && <div className='w-full h-[10vh] flex items-center justify-center'>
                            <h1 className="text-xs font-medium text-slate-400">{headSearchTerm ? "No matching users" : "No business staffs found"}</h1>
                        </div>}
                        {filteredHeadStaffs?.map(( staff: any ) => <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={staff?._id}
                            className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-start mt-2 relative"
                            onClick={() => setSelectedUser(staff?.user_id?._id)}
                        >
                            <div className="flex items-center gap-1">
                                <Avatar src={staff?.user_id?.avatar_url || '/avatar.png'} size={30} />
                                <div className="">
                                    <h1 className="text-xs font-medium">{staff?.user_id?.name}</h1>
                                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                                </div>
                            </div>
                            {staff?.user_id?._id === selectedUser && <div className="absolute top-1 right-2">
                                <Check className="text-cyan-600" strokeWidth={3} size={18} />
                            </div>}
                        </motion.div>)}
                    </div>
                    
                <DialogFooter className='w-full'>
                    <div className="pt-2 bg-slate-950/80 w-full">
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center'
                            onClick={handleAddRegionHead}
                        >
                            {addingHead ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} Add Head
                        </motion.div>
                    </div>
                </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={openAddStaffDialog} onOpenChange={setOpenAddStaffDialog}>
                <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add Region Staff</DialogTitle>
                        <DialogDescription>Adding region staff under region - {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            placeholder="Search staff by name"
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {!loadingBusinessStaffs && filteredStaffs?.length === 0 && <div className='w-full h-[10vh] flex items-center justify-center'>
                            <h1 className="text-xs font-medium text-slate-400">{staffSearchTerm ? "No matching users" : "No business staffs found"}</h1>
                        </div>}
                        {filteredStaffs?.map(( staff: any ) => <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={staff?._id}
                            className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-start mt-2 relative"
                            onClick={() => setSelectedUser(staff?.user_id?._id)}
                        >
                            <div className="flex items-center gap-1">
                                <Avatar src={staff?.user_id?.avatar_url || '/avatar.png'} size={30} />
                                <div className="">
                                    <h1 className="text-xs font-medium">{staff?.user_id?.name}</h1>
                                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                                </div>
                            </div>
                            {staff?.user_id?._id === selectedUser && <div className="absolute top-1 right-2">
                                <Check className="text-cyan-600" strokeWidth={3} size={18} />
                            </div>}
                        </motion.div>)}
                    </div>
                    <DialogFooter className='w-full'>
                        <div className="pt-2 bg-slate-950/80 w-full">
                            <motion.div
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.02 }}
                                className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center'
                                onClick={handleAddRegionStaff}
                            >
                                {addingStaff ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} Add Staff
                            </motion.div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Department Dialog */}
            <Dialog open={openAddDepartment} onOpenChange={setOpenAddDepartment}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Department</DialogTitle>
                        <DialogDescription>Adding department under region - {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input placeholder="Department Name" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
                        <Select value={departmentType} onValueChange={setDepartmentType}>
                            <SelectTrigger className={`w-full ${departmentType ? "text-slate-200" : "text-slate-400"}`}>
                                <SelectValue placeholder="Select Department Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {DEPARTMENT_TYPES.map((type: any) => <SelectItem key={type.value} value={type.value} className='hover:bg-gradient-to-tr from-slate-900/60 to-slate-800/60'>{type.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
                            onClick={handleAddDepartment}
                        >
                            {addingDepartment ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} Add Department
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default RegionPage
