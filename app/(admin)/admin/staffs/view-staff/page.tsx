"use client"
import React, { useEffect, useState } from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { DraftingCompass, EllipsisVertical, Eye, Files, MapPinned, Package, PencilRuler, UserRound } from 'lucide-react';
import { Avatar, Tooltip } from 'antd';
import { formatDateTiny } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { useGetUserCompleteProfile, useUpdateUserInfo } from '@/query/user/queries';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { loadAdminBusinessStaff } from '@/redux/slices/application';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  name: z.string().min(2, { message: "name must be at least 2 characters." }),
  email: z.string().email({ message: "email is required" }),
  phone: z.string().min(8, { message: "phone is required" }).max(12, { message: "not a valid phone number" }),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
})

const StaffPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { businessStaff } = useSelector((state: RootState) => state.application);
  const { mutateAsync: getUserProfile, isPending: loadingUserProfile } = useGetUserCompleteProfile();
  const [userData, setUserData] = useState<any>(null);
  const { mutateAsync: updateUserInfo } = useUpdateUserInfo()

  const [updateUserDialog, setUpdateUserDialog] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country: "",
      province: "",
      city: "",
      dob: "",
      gender: "",
    },
  })

  const handleClickEdit = () => {
    form.setValue("name", userData?.name || "");
    form.setValue("email", userData?.email || "");
    form.setValue("phone", userData?.phone || "");
    form.setValue("country", userData?.details?.country || "");
    form.setValue("province", userData?.details?.province || "");
    form.setValue("city", userData?.details?.city || "");
    form.setValue("dob", new Date(userData?.details?.dob).toISOString() || "");
    form.setValue("gender", userData?.details?.gender || "");
    setUpdateUserDialog(true);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Hello there")
    const formData = new FormData();
    formData.append('body', JSON.stringify({
      user_id: businessStaff?._id,
      name: values.name,
      email: values.email,
      phone: values.phone,
      country: values.country,
      province: values.province,
      city: values.city,
      dob: values.dob,
      gender: values.gender,
    }));

    // api for update user
    await updateUserInfo(formData);
    toast.success("User Updated Successfully");
    setUpdateUserDialog(false);
    handleGetCompleteProfile();
  }

  useEffect(() => {
    handleGetCompleteProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessStaff])

  const handleGetCompleteProfile = async () => {
    const response = await getUserProfile(businessStaff?._id || "");
    if (response?.status == 200) {
      setUserData({
        ...response?.user,
        details: response?.user_details,
        roles: response?.user_roles,
        regions: response?.user_regions,
        areas: response?.user_areas,
        locations: response?.user_locations,
        docs: response?.user_docs,
        skills: response?.user_skills,
      })
    } else {
      toast.error("Failed to fetch profile.")
    }
  }

  const handleNavigateToChangeDetails = () => {
    if (!userData) {
      toast.error("Cannot Change Details", {
        description: "User Data not found."
      });
      return;
    }
    dispatch(loadAdminBusinessStaff(userData));
    router.push(`/admin/staffs/add-staff/details`);
  }

  return (
    <div className='p-5 overflow-y-scroll pb-20'>
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Manage Staffs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{businessStaff?.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2">
        <div className="flex items-center gap-2">
          <Avatar src={userData?.avatar_url || '/avatar.png'} size={60} />
          <div>
            <h1 className='font-semibold text-sm text-slate-300 flex items-center gap-1'>{userData?.name}</h1>
            <p className='text-xs text-slate-400'>{userData?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[15vh] pb-3 mb-2 border border-slate-700/50">
        <div className="mb-1 flex items-center justify-between">
          <h1 className='font-medium text-xs text-slate-200 flex items-center gap-1'><UserRound strokeWidth={2} size={14} /> User Details</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 group rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleClickEdit}
          >
            <PencilRuler className='group-hover:text-pink-300' size={12} />
            Edit Info
          </motion.div>
        </div>
        <div className="w-full flex flex-wrap items-center lg:w-1/2">
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Name</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.name || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Email</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.email || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Phone</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.phone || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Status</p>
            <p className={`text-xs font-semibold ${businessStaff?.status == 1 ? 'text-green-600' : businessStaff?.status == 2 ? 'text-yellow-600' : businessStaff?.status == 3 ? 'text-red-600' : 'text-gray-600'}`}>{businessStaff?.status == 1 ? "Active" : businessStaff?.status == 2 ? "On Leave" : businessStaff?.status == 3 ? "Suspended" : "Inactive"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Country</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.details?.country || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Province</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.details?.province || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Gender</p>
            <p className='text-xs text-slate-300 font-semibold'>{userData?.details?.gender || "-"}</p>
          </div>
          <div className="w-full lg:w-1/2 mb-2.5">
            <p className='text-xs text-slate-400'>Date of Birth</p>
            <p className='text-xs text-slate-300 font-semibold'>{formatDateTiny(userData?.details?.dob) || "-"}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50 ">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><DraftingCompass size={14} /> Assigned Skills</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleNavigateToChangeDetails}
          >
            <PencilRuler size={12} />
            Changes
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {userData?.skills?.map((skill: any) => <div className="w-full lg:w-3/12 p-1" key={skill?._id}>
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
              <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">{skill?.skill_id?.skill_name}</h1>
            </div>
          </div>)}
        </div>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><MapPinned size={14} /> Assigned Regions</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleNavigateToChangeDetails}
          >
            <PencilRuler size={12} />
            Changes
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {userData?.regions?.map((region: any) => <div className="w-full lg:w-3/12 p-1" key={region?._id}>
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
              <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1 ">{region?.region_id?.region_name}</h1>
            </div>
          </div>)}
        </div>
      </div>

      {userData?.areas?.length > 0 && <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50 ">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><MapPinned size={14} /> Assigned Areas</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleNavigateToChangeDetails}
          >
            <PencilRuler size={12} />
            Changes
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {userData?.areas?.map((area: any) => <div className="w-full lg:w-3/12 p-1" key={area?._id}>
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
              <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">{area?.area_id?.area_name}</h1>
            </div>
          </div>)}
        </div>
      </div>}

      {userData?.locations?.length > 0 && <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50 ">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><MapPinned size={14} /> Assigned Location</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleNavigateToChangeDetails}
          >
            <PencilRuler size={12} />
            Changes
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {userData?.locations?.map((location: any) => <div className="w-full lg:w-3/12 p-1" key={location?._id}>
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800">
              <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">{location?.location_id?.location_name}</h1>
            </div>
          </div>)}
        </div>
      </div>}

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50 ">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><Files size={14} /> User Documents</h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={handleNavigateToChangeDetails}
          >
            <PencilRuler size={12} />
            Changes
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {userData?.docs?.map((doc: any) => <div className="w-full lg:w-3/12 p-1" key={doc?._id}>
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
              <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1"><Package size={14} /> {doc?.doc_name}</h1>
              <Popover>
                <PopoverTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    className='p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center absolute top-1 right-2'
                  >
                    <EllipsisVertical size={16} />
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className='w-[100px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                  <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                    <div className='w-full p-0.5 space-y-1'>
                      <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'>
                        <Eye size={12} />
                        <h1 className='text-xs font-medium'>View</h1>
                      </motion.div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>)}
        </div>
      </div>

      {/* Update the User Info */}
      <Dialog open={updateUserDialog} onOpenChange={setUpdateUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>Updating user.</DialogDescription>
          </DialogHeader>
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Name</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Email</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Phone</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Date of Birth</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user dob" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Gender</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user gender" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Country</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Province</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">City</FormLabel>
                      <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ">
                        <Input placeholder="user city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="w-full flex items-center justify-end">
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold'>
                    Update Data
                  </motion.button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StaffPage