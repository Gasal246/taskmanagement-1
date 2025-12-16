"use client"
import { RootState } from '@/redux/store'
import { Building2, Check, ChevronLeft, CircleCheckBig, EllipsisVertical, Eye, InfoIcon, Plus, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Avatar, Popconfirm } from 'antd';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddRegionDepartmentHead, useAddRegionDepartmentStaff, useGetRegionDepartmentCompleteData, useGetRegionUsers, useRemoveRegionDepartment, useRemoveRegionDepartmentStaff, useRemoveRegionDeptHead } from '@/query/business/queries';
import { toast } from 'sonner';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { useRouter } from 'next/navigation';

const RegionDepartmentPage = () => {
    const router = useRouter();
    const { departmentData, regionData } = useSelector((state: RootState) => state.application);

    const [openMessageDialog, setOpenMessageDialog] = useState<boolean>(false);
    const [messageTitle, setMessageTitle] = useState<string>("");
    const [messageContent, setMessageContent] = useState<string>("");
    const [heads, setHeads] = useState<any[]>([]);
    const [subdeps, setSubdeps] = useState<any[]>([]);
    const [staffs, setStaffs] = useState<any[]>([]);

    const { mutateAsync: getRegionUsers } = useGetRegionUsers();
    const { mutateAsync: addDepartmentHead, isPending: addingDepartmentHead } = useAddRegionDepartmentHead();
    const { mutateAsync: addDepartmentStaff, isPending: addingDepartmentStaff } = useAddRegionDepartmentStaff();
    const { mutateAsync: fetchRegionDepartmentData, isPending: loadingRegionDepartmentData } = useGetRegionDepartmentCompleteData();
    const { mutateAsync: removeDepartmentStaff } = useRemoveRegionDepartmentStaff();
    const { mutateAsync: removeRegionDepartment } = useRemoveRegionDepartment();
    const {mutateAsync: removeDeptHead} = useRemoveRegionDeptHead()

    useEffect(() => {
        if(departmentData) {
            fetchRegionUsers();
            handleFetchCompleteDepData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departmentData]);

    const handleFetchCompleteDepData = async () => {
        const res = await fetchRegionDepartmentData(departmentData?._id);
        console.log("Res: ", res);
        if(res?.status === 200) {
            setSubdeps(res?.data?.sub_deps);
            setHeads(res?.data?.heads);
            setStaffs(res?.data?.staffs);
        }
    }

    const [regionUsers, setRegionUsers] = useState<any[]>([]);
    const fetchRegionUsers = async () => {
        const res = await getRegionUsers([regionData?._id]);
        if(res?.status === 200) {
            setRegionUsers(res?.data);
        }
    }

    const handleShowMessageDialog = (title: string, content: string) => {
        setMessageTitle(title);
        setMessageContent(content);
        setOpenMessageDialog(true);
    }

    const [openAddDepartmentHead, setOpenAddDepartmentHead ] = useState<boolean>(false);
    const [selectedUser, setSelectedUser ] = useState<string>("");
    const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

    const clickAddHead = () => {
        setSelectedUser("");
        setIsAddingUser(false);
        setOpenAddDepartmentHead(true);
    }
    
    const clickAddStaff = () => {
        setSelectedUser("");
        setIsAddingUser(true);
        setOpenAddDepartmentHead(true);
    }
    
    const handleAddDepartmentHead = async () => {
        if(!selectedUser) {
            return toast.error("Please select a user before continue.")
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            reg_dep_id: departmentData?._id,
        }));
        const res = await addDepartmentHead(formData);
        if(res?.status === 200) {
            toast.success(res?.message);
            setOpenAddDepartmentHead(false);
            setSelectedUser("");
            fetchRegionUsers();
            handleFetchCompleteDepData();
        } else {
            return toast.error(res?.message || "Failed to add department head.")
        }
    }

    const handleAddDepartmentStaff = async () => {
        if(!selectedUser) {
            return toast.error("Please select a user before continue.")
        }
        const formData = new FormData();
        formData.append("body", JSON.stringify({
            user_id: selectedUser,
            region_dep_id: departmentData?._id,
        }));
        
        const res = await addDepartmentStaff(formData);
        if(res?.status === 200) {
            toast.success(res?.message);
            setOpenAddDepartmentHead(false);
            setSelectedUser("");
            fetchRegionUsers();
            handleFetchCompleteDepData();
        } else {
            return toast.error(res?.message || "Failed to add department staff.")
        }
    }

    const handleRemoveDepartmentHead = async (headId: string) => {
        const res = await removeDeptHead(headId);
        if(res?.status === 200) {
            toast.success(res?.message);
            fetchRegionUsers();
            handleFetchCompleteDepData();
        } else {
            return toast.error(res?.message || "Failed to remove department head.")
        }
    }

    const handleRemoveDepartmentStaff = async (staffId: string) => {
        const res = await removeDepartmentStaff(staffId);
        if(res?.status === 200) {
            toast.success(res?.message);
            fetchRegionUsers();
            handleFetchCompleteDepData();
        } else {
            return toast.error(res?.message || "Failed to remove department staff.")
        }
    }

    const handleRemoveDepartment = async (regDepId: string) => {
        const res = await removeRegionDepartment(regDepId);
        if(res?.status === 200) {
            toast.success(res?.message);
            fetchRegionUsers();
            router.back();
        } else {
            return toast.error(res?.message || "Failed to remove department.")
        }
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
                        <BreadcrumbPage>{departmentData?.dep_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="bg-slate-950/50 rounded-lg p-3 my-2 relative">
                <div className='flex items-center gap-2 w-full lg:w-1/2'>
                    <Building2 size={24} />
                    <div>
                        <h1 className='text-xl font-bold text-slate-300 leading-4'>{departmentData?.dep_name}</h1>
                        <p className='text-sm font-semibold text-slate-400 capitalize'><span className='text-cyan-600 text-xs'>{departmentData?.type}</span></p>
                    </div>
                </div>
                <p className='text-xs mt-1 pl-1 font-medium text-slate-400 lg:w-1/2 capitalize flex items-center gap-1'><InfoIcon size={14} /> This is a {departmentData?.type} department {departmentData?.type === 'sales' ? ', you are able to manage the staffs and subdepartments, and also can see the projects.' : ', you are able to manage the staffs and subdepartments, no projects shown for this department.'}</p>
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
                                <Popconfirm title={`Deleting Department ?`} description={`Deleting department will cause loss of data inside the department, and also will remove the department from the region.`} okText="Delete Anyway" cancelText="Cancel" onConfirm={() => { handleRemoveDepartmentHead('headId') }}>
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
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Department Heads of {departmentData?.type} in {regionData?.region_name}, they can manage the staffs, projects and connect with the co-departments in {regionData?.region_name}.</p>
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
                {!loadingRegionDepartmentData && heads?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No heads added.</h1>
                    </div>
                )}
                {loadingRegionDepartmentData && <div className="flex items-center justify-center h-[10vh]">
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


            <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Department Staffs</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Staffs of {departmentData?.type} department in {regionData?.region_name}, can be assingned to complete the task within this {departmentData?.dep_name} department.</p>
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
                {!loadingRegionDepartmentData && staffs?.length === 0 && (
                    <div className="flex items-center justify-center h-[15vh]">
                        <h1 className="text-xs font-medium text-slate-300">No staffs added.</h1>
                    </div>
                )}
                {loadingRegionDepartmentData && <div className="flex items-center justify-center h-[10vh]">
                    <LoaderSpin size={35} />
                </div>}
                <div className="flex flex-wrap mt-1">
                    {staffs?.map((staff: any) => <div className="w-full lg:w-3/12 p-1" key={staff?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 flex items-center gap-1 border border-slate-800 hover:border-cyan-700 relative">
                            <Avatar size={40} />
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
                                            <Popconfirm title="Confirm to remove this region head ?" onConfirm={() => { handleRemoveDepartmentStaff('staffId') }}>
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


            <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Sub Departments</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Sub departments of {departmentData?.type} department in {regionData?.region_name} are the {departmentData?.type} departments functioning under this department in multiple areas.</p>
                    </div>
                    <motion.div onClick={() => handleShowMessageDialog('Adding Sub Deparments', `Sub Departments for ${departmentData?.type} department "${departmentData?.dep_name}" in region "${regionData?.region_name}" can be only done by adding ${departmentData?.type} departments in areas of region "${regionData?.region_name}".`)} whileTap={{ scale: 0.96 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'>
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Sub Department</h1>
                    </motion.div>
                </div>
                <div className="flex flex-wrap mt-1">
                    {subdeps?.map((subDepartment: any) => <div className="w-full lg:w-3/12 p-1" key={subDepartment?._id}>
                        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 flex items-center gap-1 border border-slate-800 hover:border-cyan-700 relative">
                            <div>
                                <h1 className='text-sm font-bold text-slate-300'>{subDepartment?.dep_name}</h1>
                                <p className='text-xs font-semibold text-slate-400'>{subDepartment?.type}</p>
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
                                                <h1 className='text-xs font-semibold'>Manage</h1>
                                            </motion.div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>)}
                </div>
            </div>


            {departmentData?.type === "sales" && <div className="bg-slate-950/50 rounded-lg p-3 mb-2 min-h-[15vh]">
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Department Projects</h1>
                        <p className='text-xs pl-1 font-medium text-slate-400 lg:w-2/3 capitalize'>Projects of {departmentData?.type} department in {regionData?.region_name} are the projects functioning under this department in multiple areas & locations.</p>
                    </div>
                    <motion.div onClick={() => handleShowMessageDialog('Trying To Add Projects ?', `Projects for ${departmentData?.type} department "${departmentData?.dep_name}" in region "${regionData?.region_name}" can be only done by creating a new project from project area and assigning it to this department.`)} whileTap={{ scale: 0.96 }} className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'>
                        <Plus size={14} className='group-hover:text-cyan-600' />
                        <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Projects</h1>
                    </motion.div>
                </div>
                <div className="mt-1 w-full">
                    <div className="flex items-center gap-1 justify-center h-[5vh]">
                        <p className='text-xs font-medium text-slate-400'>We are planning on how to list projects here.. ( development stage )</p>
                    </div>
                </div>
            </div>}

            {/* Show the Message Dialog */}
            <Dialog open={openMessageDialog} onOpenChange={setOpenMessageDialog}>
                <DialogContent className="w-[500px] bg-black/10 backdrop-blur-sm border-slate-700">
                    <DialogHeader>
                        <DialogTitle>{messageTitle}</DialogTitle>
                        <DialogDescription>{messageContent}</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Add Region Department Head Dialog */}
            <Dialog open={openAddDepartmentHead} onOpenChange={setOpenAddDepartmentHead}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className='capitalize'>Adding Department {isAddingUser ? 'Staff' : 'Head'}</DialogTitle>
                        <DialogDescription>Adding {isAddingUser ? 'Staff' : 'Head'} For {departmentData?.type} Department {departmentData?.dep_name} of {regionData?.region_name}.</DialogDescription>
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
                            onClick={isAddingUser ? handleAddDepartmentStaff : handleAddDepartmentHead}
                        >
                            {(addingDepartmentHead || addingDepartmentStaff) ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {(addingDepartmentHead || addingDepartmentStaff) ? 'Adding' : 'Add'} Department {isAddingUser ? 'Staff' : 'Head'}
                        </motion.div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default RegionDepartmentPage