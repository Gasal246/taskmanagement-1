"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Building, Check, ChevronLeft, CircleCheckBig, InfoIcon, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from 'antd';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Popconfirm } from 'antd';
import { EllipsisVertical } from 'lucide-react';
import { Eye } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { useAddLocationDepartment, useAddLocationStaff, useAddLoctionHead, useGetLocationCompleteData, useRemoveLocationHead, useRemoveLocationStaff } from '@/query/business/queries';
import { useGetBusinessStaffs } from '@/query/user/queries';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import { loadDepartmentData } from '@/redux/slices/application';

const LocationPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { locationData, areaData, regionData } = useSelector((state: RootState) => state.application);
  const { businessData } = useSelector((state: RootState) => state.user);

  const { mutateAsync: getLocationCompleteData, isPending: loadingLocationCompleteData } = useGetLocationCompleteData();
  const { mutateAsync: addLocationDepartment, isPending: addingDepartment } = useAddLocationDepartment();
  const { mutateAsync: addLocationHead, isPending: addingHead } = useAddLoctionHead();
  const { mutateAsync: removeLocationHead } = useRemoveLocationHead();
  const { mutateAsync: addLocationStaff, isPending: addingStaff } = useAddLocationStaff();
  const { mutateAsync: removeLocationStaff } = useRemoveLocationStaff();

  const [heads, setHeads] = useState<any>([]);
  const [staffs, setStaffs] = useState<any>([]);
  const [departments, setDepartments] = useState<any>([]);
  const { data: businessStaffs, isLoading: loadingBusinessStaffs } = useGetBusinessStaffs(businessData?._id);

  useEffect(() => {
    if (locationData?._id) {
      handleFetchCompleteData();
    } else {
      router.replace('/admin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData])

  const handleFetchCompleteData = async () => {
    const res = await getLocationCompleteData(locationData?._id);
    if (res?.status === 200) {
      setHeads(res?.data?.heads);
      setStaffs(res?.data?.staffs);
      setDepartments(res?.data?.departments);
    }
    console.log("Location Data", res);
  };

  const handleManageDepartment = (dep: any) => {
    if(!dep) return;
    dispatch(loadDepartmentData(dep));
    router.push('/admin/regions/area/department');
  }

  const [addHeadDialog, setAddHeadDilog] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

  const handleClickAddHead = () => {
    setSelectedUser("");
    setAddHeadDilog(true);
    setIsAddingUser(false);
  }

  const handleClickAddStaff = () => {
    setSelectedUser("");
    setAddHeadDilog(true);
    setIsAddingUser(true);
  }

  const handleAddHead = async () => {
    if (!selectedUser) {
      return toast.error("User is Required.", { description: "Please select a valid user." })
    }
    if (heads?.find((head: any) => head?.user_id === selectedUser)) {
      return toast.error("User is Already Added as Head.", { description: "User is already added." })
    }
    const formData = new FormData();
    formData.append("body", JSON.stringify({
      user_id: selectedUser,
      location_id: locationData?._id,
      area_id: areaData?._id,
      region_id: regionData?._id,
    }));
    const res = await addLocationHead(formData);
    if (res?.status === 200) {
      toast.success("Head Added Successfully.", { description: "Head added successfully." })
      setAddHeadDilog(false)
      handleFetchCompleteData();
    }
  }

  const handleRemoveLocationHead = async (LocHeadId: string) => {
    const res = await removeLocationHead(LocHeadId);
    if (res?.status === 200) {
      toast.success("Head Removed Successfully.")
      handleFetchCompleteData();
    }
  }

  const handleAddStaff = async () => {
    if (!selectedUser) {
      return toast.error("User is Required.", { description: "Please select a valid user." })
    }
    if (staffs?.find((staff: any) => staff?.user_id === selectedUser)) {
      return toast.error("User is Already Added as Staff.", { description: "User is already added." })
    }
    const formData = new FormData();
    formData.append("body", JSON.stringify({
      user_id: selectedUser,
      location_id: locationData?._id,
      area_id: areaData?._id,
      region_id: regionData?._id,
    }));
    const res = await addLocationStaff(formData);
    if (res?.status === 200) {
      toast.success("Staff Added Successfully.", { description: "Staff added successfully." })
      setAddHeadDilog(false)
      handleFetchCompleteData();
    }
  }

  const handleRemoveLocationStaff = async (LocStaffId: string) => {
    const res = await removeLocationStaff(LocStaffId);
    if (res?.status === 200) {
      toast.success("Staff Removed Successfully.")
      handleFetchCompleteData();
    }
  }

  // department
  const [addDepDialog, setAddDepDialog] = useState<boolean>(false);
  const [depName, setDepName] = useState<string>("");
  const [depType, setDepType] = useState<string>("");

  const handleAddDep = async () => {
    if (!depName || !depType) {
      return toast.error("Department Name and Type are Required.", { description: "Please enter a valid department name and type." })
    }
    const formData = new FormData();
    formData.append("body", JSON.stringify({
      dep_name: depName,
      type: depType,
      location_id: locationData?._id,
      area_id: areaData?._id,
      region_id: regionData?._id,
    }));
    const res = await addLocationDepartment(formData);
    if (res?.status === 200) {
      toast.success("Department Added Successfully.", { description: "Department added successfully." })
      setAddDepDialog(false)
      handleFetchCompleteData();
    }
  }


  return (
    <div className="p-4 pb-20">
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
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{locationData?.location_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2">
        <div className='flex items-center gap-2 w-full lg:w-1/2'>
          <Building size={24} />
          <div>
            <h1 className='text-xl font-bold text-slate-300 leading-4'>{locationData?.location_name}</h1>
          </div>
        </div>
        <p className='text-xs mt-1 pl-1 font-medium text-slate-400 lg:w-1/2 capitalize flex items-center gap-1'><InfoIcon size={14} /> Manage the location heads, staffs, departments and co-departments of {locationData?.location_name}.</p>
      </div>

      {/* Location Heads */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Location Heads</h1>
            <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Location Heads of {locationData?.location_name}, {areaData?.area_name}, {regionData?.region_name}, are able to manage the departments and staffs under this location.</p>
          </div>
          <motion.div
            whileTap={{ scale: 0.96 }}
            className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
            onClick={handleClickAddHead}
          >
            <Plus size={14} className='group-hover:text-cyan-600' />
            <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Head</h1>
          </motion.div>
        </div>
        {!loadingLocationCompleteData && heads?.length === 0 && (
          <div className="flex items-center justify-center h-[15vh]">
            <h1 className="text-xs font-medium text-slate-300">No heads added.</h1>
          </div>
        )}
        {loadingLocationCompleteData && <div className="flex items-center justify-center h-[10vh]">
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
                        <Popconfirm title="Confirm to remove this location head ?" onConfirm={() => handleRemoveLocationHead(head?._id)}>
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

      {/* Location Departments */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> {locationData?.location_name} Departments</h1>
            <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Departments under {locationData?.location_name}, {areaData?.area_name}, {regionData?.region_name}, Preview for managing location departments.</p>
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
        {!loadingLocationCompleteData && departments?.length === 0 && (
          <div className="flex items-center justify-center h-[15vh]">
            <h1 className="text-xs font-medium text-slate-300">No departments added.</h1>
          </div>
        )}
        {loadingLocationCompleteData && <div className="flex items-center justify-center h-[10vh]">
          <LoaderSpin size={35} />
        </div>}
        <div className="flex flex-wrap mt-1">
          {departments?.map((dep: any) =>
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
                          onClick={() => handleManageDepartment(dep)}
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

      {/* Location Staffs */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-3 my-2 min-h-[15vh]">
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-sm font-medium text-slate-300 capitalize flex items-center gap-1'><InfoIcon size={14} /> Location Staffs</h1>
            <p className='text-xs pl-1 font-medium text-slate-400 capitalize'>Location staffs of {locationData?.location_name}, {areaData?.area_name}, {regionData?.region_name}, are able to complete tasks under this location.</p>
          </div>
          <motion.div
            whileTap={{ scale: 0.96 }}
            className='flex items-center gap-1 cursor-pointer bg-gradient-to-tr from-slate-950/50 to-slate-950/70 rounded-lg p-2 hover:bg-slate-950/70 border border-slate-700 hover:border-cyan-600 group'
            onClick={handleClickAddStaff}
          >
            <Plus size={14} className='group-hover:text-cyan-600' />
            <h1 className='text-xs font-medium text-slate-400 group-hover:text-cyan-600 capitalize flex items-center gap-1'>Add Staff</h1>
          </motion.div>
        </div>
        {!loadingLocationCompleteData && staffs?.length === 0 && (
          <div className="flex items-center justify-center h-[15vh]">
            <h1 className="text-xs font-medium text-slate-300">No staffs added.</h1>
          </div>
        )}
        {loadingLocationCompleteData && <div className="flex items-center justify-center h-[10vh]">
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
                      <Popconfirm title="Confirm to remove this location staff ?" onConfirm={() => handleRemoveLocationStaff(staff?._id)}>
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


      {/* Add Area Head or Staffs */}
      <Dialog open={addHeadDialog} onOpenChange={setAddHeadDilog}>
        <DialogContent className="sm:max-w-[425px]  bg-transparent backdrop-blur-sm border-slate-700">
          <DialogHeader>
            <DialogTitle className='capitalize'>Adding Area {isAddingUser ? 'Staff' : 'Head'}</DialogTitle>
            <DialogDescription>Adding {isAddingUser ? 'Staff' : 'Head'} For {areaData?.area_name} of {regionData?.region_name}.</DialogDescription>
          </DialogHeader>
          <div className="">
            {!loadingBusinessStaffs && businessStaffs?.length === 0 && <div className='w-full h-[10vh] flex items-center justify-center'>
              <h1 className="text-xs font-medium text-slate-400">No business staffs found</h1>
            </div>}
            {businessStaffs?.map((staff: any) => <motion.div
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
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
              onClick={isAddingUser ? handleAddStaff : handleAddHead}
            >
              {(addingHead || addingStaff) ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {(addingHead || addingStaff) ? 'Adding' : 'Add'} Area {isAddingUser ? 'Staff' : 'Head'}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={addDepDialog} onOpenChange={setAddDepDialog}>
        <DialogContent className="sm:max-w-[425px]  bg-transparent backdrop-blur-sm border-slate-700">
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
                {DEPARTMENT_TYPES.map((dep: any) => <SelectItem key={dep.value} value={dep.value} className='hover:bg-gradient-to-tr from-slate-900/60 to-slate-800/60 capitalize text-slate-300 text-sm py-1 px-2'>{dep.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <motion.div
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className='p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center mt-2'
              onClick={handleAddDep}
            >
              {addingDepartment ? <LoaderSpin size={22} /> : <CircleCheckBig className="group-hover:text-cyan-600" size={18} />} {addingDepartment ? 'Adding' : 'Add'} Department
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LocationPage
