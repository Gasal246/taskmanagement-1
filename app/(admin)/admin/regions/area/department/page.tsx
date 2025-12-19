"use client"
import { AppDispatch, RootState } from '@/redux/store'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, CircleCheckBig, Eye, InfoIcon, PencilRuler, Plus, School2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { EllipsisVertical } from "lucide-react";
import { Avatar, Popconfirm } from 'antd';
import { useAddAreaDepartmentHead, useAddAreaDepartmentStaff, useAddLocationDepartmentHead, useAddLocationDepartmentStaff, useGetAreaDepartmentCompleteData, useGetAreaLocations, useGetAreaUsers, useGetLocationDepartmentCompleteData, useGetLocationUsers, useRemoveAreaDepartment, useRemoveAreaDepartmentHead, useRemoveAreaDepartmentStaff, useRemoveLocationDepartment, useRemoveLocationDepartmentHead, useRemoveLocationDepartmentStaff } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadDepartmentData, loadLocationData } from '@/redux/slices/application';

const AreaDepartmentPage = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { regionData, areaData, departmentData, locationData } = useSelector((state: RootState) => state.application);

    const { mutateAsync: getCompleteData, isPending: loadingCompleteData } = useGetAreaDepartmentCompleteData();
    const { mutateAsync: getLocationCompleteData, isPending: loadingLocationCompleteData } = useGetLocationDepartmentCompleteData();
    const { mutateAsync: getAreaLocations } = useGetAreaLocations();
    const { mutateAsync: getAreaUsers } = useGetAreaUsers();
    const { mutateAsync: getLocationUsers } = useGetLocationUsers();
    const { mutateAsync: addAreaDepartmentHead, isPending: addingDepartmentHead } = useAddAreaDepartmentHead();
    const { mutateAsync: addAreaDepartmentStaff, isPending: addingDepartmentStaff } = useAddAreaDepartmentStaff();
    const { mutateAsync: addLocationDepartmentHead, isPending: addingLocationDepartmentHead } = useAddLocationDepartmentHead();
    const { mutateAsync: addLocationDepartmentStaff, isPending: addingLocationDepartmentStaff } = useAddLocationDepartmentStaff();
    const { mutateAsync: removeAreaDepartmentHead } = useRemoveAreaDepartmentHead();
    const { mutateAsync: removeAreaDepartmentStaff } = useRemoveAreaDepartmentStaff();
    const { mutateAsync: removeAreaDepartment } = useRemoveAreaDepartment();
    const { mutateAsync: removeLocationDepartmentHead } = useRemoveLocationDepartmentHead();
    const { mutateAsync: removeLocationDepartmentStaff } = useRemoveLocationDepartmentStaff();
    const { mutateAsync: removeLocationDepartment } = useRemoveLocationDepartment();

    const [heads, setHeads] = useState<any>([]);
    const [staffs, setStaffs] = useState<any>([]);
    const [subDepartments, setSubDepartments] = useState<any[]>([]);
    const [areaLocations, setAreaLocations] = useState<any[]>([]);
    const [areaUsers, setAreaUsers] = useState<any>([]);
    const [locationUsers, setLocationUsers] = useState<any>([]);
    const isLocationDepartment = Boolean(departmentData?.location_id);
    const locationId = isLocationDepartment ? (departmentData?.location_id?._id || departmentData?.location_id) : undefined;
    const locationName = isLocationDepartment
        ? (locationData?.location_name || areaLocations?.find((loc: any) => loc?._id === locationId)?.location_name || departmentData?.location_id?.location_name || departmentData?.location?.location_name)
        : undefined;
    const showLocationCrumb = Boolean(isLocationDepartment && locationName);
    const isLoadingDepartmentData = isLocationDepartment ? loadingLocationCompleteData : loadingCompleteData;
    const isAddingDepartmentHead = isLocationDepartment ? addingLocationDepartmentHead : addingDepartmentHead;
    const isAddingDepartmentStaff = isLocationDepartment ? addingLocationDepartmentStaff : addingDepartmentStaff;
    const departmentUsers = isLocationDepartment ? locationUsers : areaUsers;
    const departmentScopeLabel = isLocationDepartment
        ? `${regionData?.region_name}, ${areaData?.area_name}, ${locationName || 'this location'}`
        : `${regionData?.region_name}, ${areaData?.area_name}`;

    useEffect(() => {
        if (departmentData?._id) {
            handleFetchCompleteDepData();
            handleFetchAreaLocations();
            if(isLocationDepartment) {
                handleFetchLocationUsers();
            } else {
                handleFetchAreaUsers();
            }
        } else {
            router.push("/admin");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departmentData]);

    const handleFetchCompleteDepData = async () => {
        const res = isLocationDepartment
            ? await getLocationCompleteData(departmentData?._id)
            : await getCompleteData(departmentData?._id);
        if (res?.status === 200) {
            console.log("Res: ", res);
            setHeads(res?.data?.heads || []);
            setStaffs(res?.data?.staffs || []);
            setSubDepartments(isLocationDepartment ? [] : (res?.data?.subdeps || []));
        } else {
            return toast.error("Data not fetched!!", { description: "Something went wrong while fetching complete department data" })
        }
    }

    const handleFetchAreaLocations = async () => {
        if(!areaData?._id) return;
        const res = await getAreaLocations({ area_ids: [areaData?._id] });
        if(res?.status === 200) {
            setAreaLocations(res?.data || []);
        }
    }

    const handleFetchAreaUsers = async () => {
        const res = await getAreaUsers([areaData?._id]);
        console.log("area users: ", res?.data[0]?.user_id?.name);
        
        if (res?.status === 200) {
            setAreaUsers(res?.data || []);
        }
    }

    const handleFetchLocationUsers = async () => {
        const locId = locationData?._id || locationId;
        if(!locId) return;
        const res = await getLocationUsers(locId);
        if(res?.status === 200) {
            setLocationUsers(res?.data || []);
        }
    }

    const handleRemoveDepartment = async () => {
        const res = isLocationDepartment
            ? await removeLocationDepartment(departmentData?._id)
            : await removeAreaDepartment(departmentData?._id);
        if (res?.status === 200) {
            toast.success("Department Removed Successfully!!", { description: "Department Removed Successfully!!" })
            router.back();
        } else {
            return toast.error("Department not removed!!", { description: res?.error || "Something went wrong while removing department" })
        }
    }

    const [selectedUser, setSelectedUser] = useState<string>("");
    const [isAddingStaff, setIsAddingStaff] = useState<boolean>(false);
    const [addStaffOpen, setAddStaffOpen] = useState<boolean>(false);

    const clickAddHead = () => {
        setSelectedUser("");
        setIsAddingStaff(false);
        setAddStaffOpen(true);
    }

    const handleAddDepartmentHead = async () => {
        if (!selectedUser) {
            return toast.error("Please select a user before continue.")
        }
        if (heads?.find((head: any) => head?.user_id === selectedUser)) {
            return toast.error("User is Already Added as Head.", { description: "User is already added." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            dep_id: departmentData?._id,
        }));
        const res = isLocationDepartment
            ? await addLocationDepartmentHead(formData)
            : await addAreaDepartmentHead(formData);
        if (res?.status === 200) {
            toast.success("Department Head Added Successfully!!", { description: "Department Head Added Successfully!!" })
            handleFetchCompleteDepData();
            if(isLocationDepartment) {
                handleFetchLocationUsers();
            } else {
                handleFetchAreaUsers();
            }
            setAddStaffOpen(false);
        } else {
            return toast.error("Head not added!!", { description: res?.error || "Something went wrong while adding department head" })
        }
    }

    const clickAddStaff = () => {
        setSelectedUser("");
        setIsAddingStaff(true);
        setAddStaffOpen(true);
    }

    const handleAddDepartmentStaff = async () => {
        if (!selectedUser) {
            return toast.error("Please select a user before continue.")
        }
        if (staffs?.find((staff: any) => staff?.user_id === selectedUser)) {
            return toast.error("User is Already Added as Staff.", { description: "User is already added." })
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            dep_id: departmentData?._id,
        }));
        const res = isLocationDepartment
            ? await addLocationDepartmentStaff(formData)
            : await addAreaDepartmentStaff(formData);
        if (res?.status === 200) {
            toast.success("Department Staff Added Successfully!!", { description: "Department Staff Added Successfully!!" })
            handleFetchCompleteDepData();
            if(isLocationDepartment) {
                handleFetchLocationUsers();
            } else {
                handleFetchAreaUsers();
            }
            setAddStaffOpen(false);
        } else {
            return toast.error("Staff not added!!", { description: res?.error || "Something went wrong while adding department staff" })
        }
    }

    const handleRemoveDepartmentHead = async (headId: string) => {
        const res = isLocationDepartment
            ? await removeLocationDepartmentHead(headId)
            : await removeAreaDepartmentHead(headId);
        if (res?.status === 200) {
            toast.success("Department Head Removed Successfully!!", { description: "Department Head Removed Successfully!!" })
            handleFetchCompleteDepData();
        } else {
            return toast.error("Head not removed!!", { description: res?.error || "Something went wrong while removing department head" })
        }
    }

    const handleRemoveDepartmentStaff = async (staffId: string) => {
        const res = isLocationDepartment
            ? await removeLocationDepartmentStaff(staffId)
            : await removeAreaDepartmentStaff(staffId);
        if (res?.status === 200) {
            toast.success("Department Staff Removed Successfully!!", { description: "Department Staff Removed Successfully!!" })
            handleFetchCompleteDepData();
        } else {
            return toast.error("Staff not removed!!", { description: res?.error || "Something went wrong while removing department staff" })
        }
    }

    
    const handleViewSubDepartment = (subDepartment: any) => {
        const locId = subDepartment?.location_id?._id || subDepartment?.location_id;
        const location = areaLocations?.find((loc: any) => loc?._id === locId);
        if(location) {
            dispatch(loadLocationData(location));
        }
        dispatch(loadDepartmentData(subDepartment));
        router.push('/admin/regions/area/department');
    }


    return (
        <div className='p-4 pb-20'>
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
                    {showLocationCrumb && (
                        <>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{locationName}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </>
                    )}
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{departmentData?.dep_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 relative">
                <div className="flex items-center gap-2">
                    <div className="">
                        <h1 className='text-xl font-bold text-slate-300 flex items-center gap-1'><School2 size={20} /> {departmentData?.dep_name}</h1>
                        <div className="flex items-center opacity-80">
                            <h1 className='text-xs text-slate-300 font-semibold h-[20px] rounded-l-lg bg-slate-900 w-12 text-center p-0.5'>Type</h1>
                            <h1 className='text-sm text-slate-900 font-semibold capitalize h-[20px] rounded-r-lg bg-slate-300 min-w-24 text-center px-3'>{departmentData?.type}</h1>
                        </div>
                    </div>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='absolute right-3 top-2 hover:bg-slate-700/50 p-1 rounded-full cursor-pointer'
                        >
                            <EllipsisVertical size={20} />
                        </motion.div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                        <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                            <div className='w-full p-0.5 space-y-1'>
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    whileHover={{ scale: 1.02 }}
                                    className='bg-slate-800/50 w-full p-1 py-2 text-purple-500 cursor-pointer hover:text-purple-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                                    <PencilRuler size={12} />
                                    <h1 className='text-xs font-semibold'>Update</h1>
                                </motion.div>
                                <Popconfirm title={`Deleting Department ?`} description={`Deleting department will cause loss of data inside the department, and also will remove the department from the region.`} okText="Delete Anyway" cancelText="Cancel" onConfirm={handleRemoveDepartment}>
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

            {/* Department Heads */}
            <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Department Heads</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Department Heads of {departmentData?.type} Department in {departmentScopeLabel}, those can manage the staffs, projects and connect with the co-departments in {areaData?.area_name}.</p>
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
                {!isLoadingDepartmentData && heads?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No heads added.</h1>
                    </div>
                )}
                {isLoadingDepartmentData && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {heads?.map((head: any) => (
                        <div className="w-full lg:w-4/12 p-1" key={head?._id}>
                            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 flex items-center gap-1 border border-slate-800 hover:border-cyan-700 relative">
                                <Avatar size={40} src={head?.user?.avatar_url || '/avatar.png'} />
                                <div>
                                    <h1 className='text-xs font-medium text-slate-300'>{head?.user?.name}</h1>
                                    <p className='text-xs font-medium text-slate-400'>{head?.user?.email}</p>
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
                                                <Popconfirm title="Confirm to remove this region head ?" onConfirm={() => { handleRemoveDepartmentHead(head?._id) }}>
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
                        </div>))}
                </div>
            </div>

            {!isLocationDepartment && (
                <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                    <div className='flex items-center justify-between'>
                        <div>
                            <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Sub Departments</h1>
                            <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Location departments of {departmentData?.type} under {areaData?.area_name}.</p>
                        </div>
                    </div>
                    {subDepartments?.length === 0 && (
                        <div className="flex items-center justify-center h-[15vh]">
                            <h1 className="text-xs font-medium text-slate-300">No sub departments added.</h1>
                        </div>
                    )}
                    <div className="flex flex-col gap-2 mt-2">
                        {areaLocations?.map((location: any) => {
                            const locationDepartments = subDepartments?.filter((dep: any) => {
                                const locId = dep?.location_id?._id || dep?.location_id;
                                return locId === location?._id;
                            });
                            if(!locationDepartments?.length) return null;
                            return (
                                <div key={location?._id} className="bg-gradient-to-tr from-slate-950/40 to-slate-900/40 rounded-lg p-2 border border-slate-800">
                                    <h2 className="text-xs font-semibold text-slate-300 mb-2">{location?.location_name}</h2>
                                    <div className="flex flex-wrap">
                                        {locationDepartments?.map((dep: any) => (
                                            <div className="w-full lg:w-4/12 p-1" key={dep?._id}>
                                                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 border border-slate-800 hover:border-cyan-700 relative">
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
                                                                        onClick={() => handleViewSubDepartment(dep)}
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
                            );
                        })}
                    </div>
                </div>
            )}
            {/* Department Staffs */}
            <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Department Staffs</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Department Staffs of {departmentData?.type} Department in {departmentScopeLabel}, those could complete the tasks assigned.</p>
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
                {!isLoadingDepartmentData && staffs?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No staffs added.</h1>
                    </div>
                )}
                {isLoadingDepartmentData && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {staffs?.map((staff: any) => (
                        <div className="w-full lg:w-4/12 p-1" key={staff?._id}>
                            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 flex items-center gap-1 border border-slate-800 hover:border-cyan-700 relative">
                                <Avatar size={40} src={staff?.user?.avatar_url || '/avatar.png'} />
                                <div>
                                    <h1 className='text-xs font-medium text-slate-300'>{staff?.user?.name}</h1>
                                    <p className='text-xs font-medium text-slate-400'>{staff?.user?.email}</p>
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
                                                <Popconfirm title="Confirm to remove this region head ?" onConfirm={() => { handleRemoveDepartmentStaff(staff?._id) }}>
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
                        </div>))}
                </div>
            </div>

            {/* Add Head and Staffs For Area Department */}
            <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className='capitalize'>Adding Department {isAddingStaff ? 'Staff' : 'Head'}</DialogTitle>
                        <DialogDescription>Adding {isAddingStaff ? 'Staff' : 'Head'} For {departmentData?.type} Department {departmentData?.dep_name} of {departmentScopeLabel}.</DialogDescription>
                    </DialogHeader>
                    <div className="">
                        {departmentUsers?.length === 0 && <div className='w-full h-[10vh] flex items-center justify-center'>
                            <h1 className="text-xs font-medium text-slate-400">
                                {isLocationDepartment
                                    ? `No Users with location (${locationName || 'this location'}) found.`
                                    : `No Users with area (${areaData?.area_name}) found.`}
                            </h1>
                        </div>}
                        {departmentUsers?.map((user: any) => <motion.div
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
                            onClick={isAddingStaff ? handleAddDepartmentStaff : handleAddDepartmentHead}
                        >
                            {(isAddingDepartmentHead || isAddingDepartmentStaff) ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {(isAddingDepartmentHead || isAddingDepartmentStaff) ? 'Adding' : 'Add'} Department {isAddingStaff ? 'Staff' : 'Head'}
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}

export default AreaDepartmentPage
