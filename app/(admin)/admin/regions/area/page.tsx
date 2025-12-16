"use client"
import { RootState } from '@/redux/store'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, CircleCheckBig, InfoIcon, Plus, School2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from 'antd';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Popconfirm } from 'antd';
import { EllipsisVertical } from 'lucide-react';
import { Eye } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useAddAreaDepartment, useAddAreaHead, useAddAreaStaff, useAddBusinessLocation, useGetAreaCompleteData, useGetRegionUsers, useRemoveAreaHead, useRemoveAreaStaff } from '@/query/business/queries';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { loadDepartmentData, loadLocationData } from '@/redux/slices/application';

const RegionAreaPage = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { businessData } = useSelector((state: RootState) => state.user)
    const { regionData, areaData } = useSelector((state: RootState) => state.application);

    const { mutateAsync: addBusinessLocation, isPending: addingBusinessLocation } = useAddBusinessLocation();
    const { mutateAsync: getCompleteArea, isPending: loadingCompleteArea } = useGetAreaCompleteData();
    const { mutateAsync: getRegionUsers } = useGetRegionUsers();
    const { mutateAsync: addAreaHead, isPending: addingAreaHead } = useAddAreaHead();
    const { mutateAsync: addAreaStaff, isPending: addingAreaStaff } = useAddAreaStaff();
    const { mutateAsync: removeAreaHead } = useRemoveAreaHead();
    const { mutateAsync: removeAreaStaff } = useRemoveAreaStaff();
    const { mutateAsync: addAreaDepartment, isPending: addingAreaDepartment } = useAddAreaDepartment();

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [heads, setHeads] = useState<any[]>([]);
    const [staffs, setStaffs] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [area_deps, setAreaDeps] = useState<any[]>([]);

    useEffect(() => {
        if(areaData?._id) {
            handleFetchCompleteData();
            handleFetchRegionUsers();
        } else {
            router.replace('/admin')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [areaData]);

    const handleFetchCompleteData = async () => {
        const res = await getCompleteArea(areaData?._id);
        if(res?.status === 200) {
            setHeads(res?.data?.heads);
            setStaffs(res?.data?.staffs);
            setLocations(res?.data?.locations);
            setAreaDeps(res?.data?.departments);
        }
        // console.log(res);
    }

    // Add location
    const [addLocationDialog, setAddLocationDialog] = useState<boolean>(false);
    const [location, setLocation] = useState<string>("");

    const handleAddLocation = async () => {
        if (!location) {
            return toast.error("Location Name is Required.", { description: "Please enter a valid location name." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            location_name: location,
            area_id: areaData?._id,
            region_id: regionData?._id,
            business_id: businessData?._id
        }));
        const res = await addBusinessLocation(formData);
        if (res?.status === 200) {
            toast.success("Location Added Successfully.", { description: "Location added successfully." })
            setLocation("")
            setAddLocationDialog(false)
        }
    }

    // Region Users
    const [regionUsers, setRegionUsers] = useState<any[]>();
    const [openAreaHeadOrStaffDialog, setOpenAreaHeadOrStaffDialog] = useState<boolean>(false);
    const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
    
    const handleFetchRegionUsers = async () => {
        const res = await getRegionUsers([regionData?._id])
        if(res?.status === 200) {
            setRegionUsers(res?.data);
        }
    }

    const clickAddHead = () => {
        setSelectedUser("");
        setIsAddingUser(false);
        setOpenAreaHeadOrStaffDialog(true);
    }

    const clickAddStaff = () => {
        setSelectedUser("");
        setIsAddingUser(true);
        setOpenAreaHeadOrStaffDialog(true);
    }

    const handleAddAreaHead = async () => {
        if(!selectedUser) {
            return toast.error("User is Required.", { description: "Please select a valid user." })
        }
        if(heads?.find((head: any) => head?.user_id === selectedUser)) {
            return toast.error("User is Already Added as Head.", { description: "User is already added." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            area_id: areaData?._id,
        }));
        const res = await addAreaHead(formData);
        if(res?.status === 200) {
            setSelectedUser("");
            toast.success("Area Head Added Successfully.", { description: "Area head added successfully." })
            setOpenAreaHeadOrStaffDialog(false);
            handleFetchCompleteData();
        }
    }

    const handleAddAreaStaff = async () => {
        if(!selectedUser) {
            return toast.error("User is Required.", { description: "Please select a valid user." })
        }
        if(staffs?.find((staff: any) => staff?.user_id === selectedUser)) {
            return toast.error("User is Already Added as Staff.", { description: "User is already added." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            area_id: areaData?._id,
        }));
        const res = await addAreaStaff(formData);
        if(res?.status === 200) {
            setSelectedUser("");
            toast.success("Area Staff Added Successfully.", { description: "Area staff added successfully." })
            setOpenAreaHeadOrStaffDialog(false);
            handleFetchCompleteData();
        }
    }

    const handleRemoveAreaHead = async (AreaHeadId: string) => {
        const res = await removeAreaHead(AreaHeadId);
        if(res?.status === 200) {
            toast.success("Area Head Removed Successfully.", { description: "Area head removed successfully." })
            setOpenAreaHeadOrStaffDialog(false);
            handleFetchCompleteData();
        }
    }

    const handleRemoveAreaStaff = async (AreaStaffId: string) => {
        const res = await removeAreaStaff(AreaStaffId);
        if(res?.status === 200) {
            toast.success("Area Staff Removed Successfully.", { description: "Area staff removed successfully." })
            setOpenAreaHeadOrStaffDialog(false);
            handleFetchCompleteData();
        }
    }

    const [addDepDialog, setAddDepDialog] = useState<boolean>(false);
    const [depName, setDepName] = useState<string>("");
    const [depType, setDepType] = useState<string>("");

    const handleAddDep = async () => {
        if(!depName || !depType) {
            return toast.error("Department Name and Type are Required.", { description: "Please enter a valid department name and type." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            dep_name: depName,
            type: depType,
            area_id: areaData?._id,
            region_id: regionData?._id,
        }));
        const res = await addAreaDepartment(formData);
        if(res?.status === 200) {
            toast.success("Department Added Successfully.", { description: "Department added successfully." })
            setAddDepDialog(false)
            handleFetchCompleteData();
        }
    }

    const handlePreviewLocation = (location: any) => {
        dispatch(loadLocationData(location));
        router.push('/admin/regions/area/location')
    }

    const handlePreviewDepartment = ( department: any ) => {
        dispatch(loadDepartmentData(department));
        router.push('/admin/regions/area/department');
    }

    return (
        <div className='p-4 mb-20'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()} className='flex items-center gap-1 bg-gradient-to-br from-black/20 to-black rounded-lg px-2 p-1 pr-4 cursor-pointer group'><ChevronLeft size={16} className='group-hover:text-cyan-600' /> <span className='text-slate-300 group-hover:text-cyan-600 text-xs'>Back</span></BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{regionData?.region_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{areaData?.area_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2">
                <div className='flex items-center gap-2 w-full lg:w-1/2'>
                    <School2 size={24} />
                    <div>
                        <h1 className='text-xl font-bold text-slate-300 leading-4'>{areaData?.area_name}</h1>
                    </div>
                </div>
                <p className='text-xs mt-1 pl-1 font-medium text-slate-400 lg:w-1/2 capitalize flex items-center gap-1'><InfoIcon size={14} /> Manage the area heads, staffs, departments and sub-departments of {areaData?.area_name}&apos;s sub-locations.</p>
            </div>

            {/* Area Heads */}
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Area Heads</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Area Heads of {areaData?.area_name}, {regionData?.region_name}, are able to manage the departments and staffs under this area.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
                        onClick={clickAddHead}
                    >
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Head</h1>
                    </motion.div>
                </div>
                {!loadingCompleteArea && heads?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No heads added.</h1>
                    </div>
                )}
                {loadingCompleteArea && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {heads?.map((head: any) => 
                    <div className="w-full lg:w-4/12 p-1" key={head?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 border border-slate-700 hover:border-cyan-600 flex items-center gap-1 select-none relative">
                            <Avatar src={head?.user?.AvatarUrl} size={40} />
                            <div>
                                <h1 className='text-xs font-medium text-slate-300 capitalize flex items-center gap-1'>{head?.user?.name}</h1>
                                <p className='text-xs font-medium text-slate-400 flex items-center gap-1'>{head?.user?.email}</p>
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
                                            <Popconfirm title="Confirm to remove this area head ?" onConfirm={() => handleRemoveAreaHead(head?._id)}>
                                                <motion.div
                                                    whileTap={{ scale: 0.98 }}
                                                    whileHover={{ scale: 1.02 }}
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
                    </div>
                )}
                </div>
            </div>

            {/* Area Departments */}
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Area Departments</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Departments under {areaData?.area_name}, {regionData?.region_name}, Preview for managing area departments.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
                        onClick={() => setAddDepDialog(true)}
                    >
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Department</h1>
                    </motion.div>
                </div>
                {!loadingCompleteArea && area_deps?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No departments added.</h1>
                    </div>
                )}
                {loadingCompleteArea && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {area_deps?.map((dep: any) => 
                    <div className="w-full lg:w-4/12 p-1" key={dep?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 border border-slate-700 hover:border-cyan-600 flex items-center gap-1 select-none relative">
                            <div>
                                <h1 className='text-sm font-semibold text-slate-300 capitalize flex items-center gap-1'>{dep?.dep_name}</h1>
                                <p className='text-xs font-medium text-cyan-600 flex items-center gap-1'>{dep?.type}</p>
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
                                                onClick={() => handlePreviewDepartment(dep)}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>Preview</h1>
                                            </motion.div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Area Locations */}
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> {areaData?.area_name} Sub-Locations</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Manage {areaData?.area_name} sub-locations, by previewing them.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
                        onClick={() => setAddLocationDialog(true)}
                    >
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Location</h1>
                    </motion.div>
                </div>
                {!loadingCompleteArea && locations?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No locations added.</h1>
                    </div>
                )}
                {loadingCompleteArea && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {locations?.length > 0 && locations?.map((location: any) => <div className="w-full lg:w-3/12 p-1" key={location?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 px-4 border border-slate-700 hover:border-cyan-600 flex items-center gap-1 select-none relative">
                            <div>
                                <h1 className='text-sm font-semibold text-slate-300 capitalize flex items-center gap-1'>{location?.location_name}</h1>
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
                                                onClick={() => handlePreviewLocation(location)}
                                                className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                                <Eye size={14} />
                                                <h1 className='text-xs font-semibold'>Preview</h1>
                                            </motion.div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>)}
                </div>
            </div>


            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Area Staffs</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Area staffs of {areaData?.area_name}, {regionData?.region_name}, are able to complete tasks under this area.</p>
                    </div>
                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
                        onClick={clickAddStaff}
                    >
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Staff</h1>
                    </motion.div>
                </div>
                {!loadingCompleteArea && staffs?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No staffs added.</h1>
                    </div>
                )}
                {loadingCompleteArea && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {staffs?.map((staff: any) => <div className="w-full lg:w-3/12 p-1" key={staff?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 border border-slate-700 hover:border-cyan-600 flex items-center gap-2 select-none relative">
                            <Avatar src={staff?.user?.avatar_url} size={40} />
                            <div>
                                <h1 className='text-xs font-medium text-slate-300 capitalize flex items-center gap-1'>{staff?.user?.name}</h1>
                                <p className='text-xs font-medium text-slate-400 flex items-center gap-1'>{staff?.user?.email}</p>
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
                                            <Popconfirm title="Confirm to remove this area head ?" onConfirm={() => handleRemoveAreaStaff(staff?._id)}>
                                                <motion.div
                                                    whileTap={{ scale: 0.98 }}
                                                    whileHover={{ scale: 1.02 }}
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

            {/* Add Region Department Head Dialog */}
            <Dialog open={addLocationDialog} onOpenChange={setAddLocationDialog}>
                <DialogContent className="sm:max-w-[425px] bg-transparent backdrop-blur-sm border-slate-700">
                    <DialogHeader>
                        <DialogTitle className='capitalize'>Adding Business Location</DialogTitle>
                        <DialogDescription>Adding location under {areaData?.area_name}, {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        <div>
                            <Label className='text-xs font-medium text-slate-400'>Location Name</Label>
                            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder='enter location name' />
                        </div>
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
                            onClick={handleAddLocation}
                        >
                            {addingBusinessLocation ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {addingBusinessLocation ? 'Adding' : 'Add'} Location
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Area Head or Staffs */}
            <Dialog open={openAreaHeadOrStaffDialog} onOpenChange={setOpenAreaHeadOrStaffDialog}>
                <DialogContent className="sm:max-w-[425px] bg-transparent backdrop-blur-sm border-slate-700">
                    <DialogHeader>
                        <DialogTitle className='capitalize'>Adding Area {isAddingUser ? 'Staff' : 'Head'}</DialogTitle>
                        <DialogDescription>Adding {isAddingUser ? 'Staff' : 'Head'} For {areaData?.area_name} of {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        {regionUsers?.length === 0 && <div className='w-full h-[10vh] flex items-center justify-center'>
                            <h1 className="text-xs font-medium text-slate-400">No region staffs found</h1>
                        </div>}
                        {regionUsers?.map(( user: any ) => <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={user?._id}
                            className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-start mt-2 relative"
                            onClick={() => setSelectedUser(user?.user_id?._id)}
                        >
                            <div className="flex items-center gap-1">
                                <Avatar src={user?.user_id?.avatar_url || '/avatar.png'} size={30} />
                                <div className="">
                                    <h1 className="text-xs font-medium">{user?.user_id?.name}</h1>
                                    <p className="text-xs text-slate-400">{user?.user_id?.email}</p>
                                </div>
                            </div>
                            {user?.user_id?._id === selectedUser && <div className="absolute top-1 right-2">
                                <Check className="text-cyan-600" strokeWidth={3} size={18} />
                            </div>}
                        </motion.div>)}
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
                            onClick={isAddingUser ? handleAddAreaStaff : handleAddAreaHead}
                        >
                            {(addingAreaHead || addingAreaStaff) ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {(addingAreaHead || addingAreaStaff) ? 'Adding' : 'Add'} Area {isAddingUser ? 'Staff' : 'Head'}
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Department Dialog */}
            <Dialog open={addDepDialog} onOpenChange={setAddDepDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Department</DialogTitle>
                        <DialogDescription>Adding department under area - {areaData?.area_name}, {regionData?.region_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input placeholder="Department Name" value={depName} onChange={(e) => setDepName(e.target.value)} />
                        <Select value={depType} onValueChange={setDepType}>
                            <SelectTrigger className={`w-full ${depType ? "text-slate-200" : "text-slate-400"}`}>
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
                            onClick={handleAddDep}
                        >
                            {addingAreaDepartment ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {addingAreaDepartment ? 'Adding' : 'Add'} Department
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default RegionAreaPage

