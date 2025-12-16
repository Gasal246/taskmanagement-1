"use client"
import ProfilPageSkeleton from '@/components/skeletons/ProfilPageSkeleton'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar } from 'antd'
import { EllipsisVertical, Edit2, Key, EyeOff, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGetAdminProfile, useGetStaffProfile, useUpdateStaffProfile } from '@/query/user/queries'
import Cookies from "js-cookie"
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'

// ──────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────
const editNameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
const ProfilPage = () => {
  const { businessData } = useSelector((state: RootState) => state.user);

  // Modal States
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const [showPassword, setShowPassword] = React.useState(false);

  //Api
  const {data: userData, isLoading: loadingUser, refetch} = useGetAdminProfile(businessData?._id);
  const { mutateAsync: UpdateProfile, isPending: isUpdating } = useUpdateStaffProfile();

  useEffect(()=> {
    console.log("userData: ", userData);
  }, [userData]);

  // Forms
  const editNameForm = useForm<z.infer<typeof editNameSchema>>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { name: "" }
  })

  const changePwForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "" }
  })

  // Open Modals
  const openEditName = () => {
    editNameForm.setValue("name", userData?.user_details?.name)
    setEditNameOpen(true)
  }
  const openChangePw = () => {
    changePwForm.reset()
    setChangePwOpen(true)
  }

  // Submit Handlers (Plug your logic here)
  const onEditNameSubmit = async (data: z.infer<typeof editNameSchema>) => {
    const payload = {
      is_password: false,
      name: data.name
    };
    const res = await UpdateProfile(payload);
    if (res.status == 201) {
      refetch();
      toast.success(res?.message);
    } else {
      toast.error(res?.message);
    }
    setEditNameOpen(false);
  }

  const onChangePwSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    const payload = {
      is_password: true,
      old_password: data.oldPassword,
      new_password: data.newPassword
    };

    const res = await UpdateProfile(payload);
    if (res?.status == 201) {
      toast.success(res?.message);
      refetch();
    } else {
      toast.error(res?.message);
    }
    setChangePwOpen(false)
  }

  return (
    <div className='w-full min-h-screen'>
      {loadingUser ? (
        <div className="flex w-full h-[70dvh] justify-center items-center">
          <ProfilPageSkeleton />
        </div>
      ) : userData ? (
        <>
          {/* ── Header ── */}
          <div className="flex flex-col pt-8 pb-8 px-4 sm:px-6 md:px-10 w-full items-center justify-center bg-slate-950/70 mb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-1 items-center w-full max-w-4xl">
              <div className="flex justify-center sm:justify-start">
                <div
                  className={`
      w-[100px] h-[100px]
      sm:w-[120px] sm:h-[120px]
      md:w-[140px] md:h-[140px]
      lg:w-[200px] lg:h-[200px]
      xl:w-[220px] xl:h-[220px]
      rounded-full overflow-hidden border-4 border-slate-800 shadow-lg
    `}
                >
                  <Image
                    src={userData?.AvatarUrl || '/avatar.png'}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left sm:ml-4">
                <h1 className='text-lg sm:text-xl md:text-2xl font-semibold text-slate-100'>{userData?.user_details?.name}</h1>
                <h1 className='text-sm sm:text-base font-medium text-slate-300 mt-1'>{userData?.user_details?.email}</h1>
                <div className="mt-3 sm:mt-2">
                  <Popover>
                    <PopoverTrigger className='bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition'>
                      <EllipsisVertical size={18} className="text-slate-300" />
                    </PopoverTrigger>
                    <PopoverContent className='w-[170px] p-1 space-y-1 mr-2 sm:mr-0'>
                      <motion.div
                        className='bg-slate-800 text-sm p-2 rounded-sm hover:bg-slate-900 cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5'
                        onClick={openEditName}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit2 size={15} /> Edit Name
                      </motion.div>
                      <motion.div
                        className='bg-slate-800 text-sm p-2 rounded-sm hover:bg-slate-900 cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5'
                        onClick={openChangePw}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Key size={15} /> Change Password
                      </motion.div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {/* ── Info Grid ── */}
          <div className="px-4 sm:px-6 md:px-10 mb-3">
            <div className="bg-slate-950/50 p-3 sm:p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                <h1 className='text-xs font-semibold text-slate-400'>User Role:</h1>
                <h1 className='text-sm font-medium text-slate-300 capitalize mt-1'>Business Admin</h1>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                <h1 className='text-xs font-semibold text-slate-400'>Business:</h1>
                <h1 className='text-sm font-medium text-slate-300 capitalize mt-1'>{userData?.business_details?.business_name || "N/A"}</h1>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                <h1 className='text-xs font-semibold text-slate-400'>Business Phone:</h1>
                <h1 className='text-sm font-medium text-slate-300 capitalize mt-1'>{userData?.business_details?.business_phone || "N/A"}</h1>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                <h1 className='text-xs font-semibold text-slate-400'>Business Country:</h1>
                <h1 className='text-sm font-medium text-slate-300 capitalize mt-1'>{userData?.business_details?.business_country || "N/A"}</h1>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                <h1 className='text-xs font-semibold text-slate-400'>Business City:</h1>
                <h1 className='text-sm font-medium text-slate-300 capitalize mt-1'>{userData?.business_details?.business_city || "N/A"}</h1>
              </div>
              {/* <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 sm:col-span-2 lg:col-span-4">
                <h1 className='text-xs font-semibold text-slate-400'>Head Information:</h1>
                {loadingHead ? (
                  <p className="text-xs text-slate-500 mt-1">Loading...</p>
                ) : (
                  <>
                    <h1 className='text-center text-xs mb-2 text-orange-600 capitalize'>-- {headInfo?.Role} --</h1>
                    <div
                      className="flex items-center gap-2 select-none cursor-pointer p-2 rounded-md hover:bg-slate-800/50 transition"
                      onClick={() => router.push(`/staff/profile/${headInfo?._id}`)}
                    >
                      <Avatar size={36} src={headInfo?.AvatarUrl || "/avatar.png"} />
                      <div>
                        <h1 className='text-sm font-medium text-slate-300'>{headInfo?.Name}</h1>
                        <h1 className='text-xs text-slate-400'>{headInfo?.Email}</h1>
                      </div>
                    </div>
                  </>
                )}
              </div> */}
            </div>
          </div>

          {/* ── Skills ── */}
          {/* <div className="px-4 sm:px-6 md:px-10 mb-6">
            <div className="bg-slate-950/50 p-3 sm:p-4 rounded-lg">
              <h1 className='text-sm font-semibold text-slate-300 mb-3'>Skills</h1>
              {userData?.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userData?.skills?.map((skill: string, index: number) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950/50 rounded-md border border-slate-700"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              ) : <h1 className='text-center text-slate-400 mt-10'>No Skills Found</h1>}
            </div>
          </div> */}
        </>
      ) : (
        <h1 className='text-center text-slate-400 mt-10'>No User Found</h1>
      )}

      {/* ── Edit Name Dialog (Same as Add Activity) ── */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>Update your display name.</DialogDescription>
          </DialogHeader>
          <Form {...editNameForm}>
            <form onSubmit={editNameForm.handleSubmit(onEditNameSubmit)} className="space-y-3">
              <FormField
                control={editNameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Name</FormLabel>
                    <FormControl className="border-slate-600 focus:border-slate-400">
                      <Input placeholder="Enter your name" {...field} />
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
                  className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Name"}
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog (Same Style) ── */}
      <Dialog open={changePwOpen} onOpenChange={setChangePwOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current and new password.</DialogDescription>
          </DialogHeader>
          <Form {...changePwForm}>
            <form onSubmit={changePwForm.handleSubmit(onChangePwSubmit)} className="space-y-3">
              <FormField
                control={changePwForm.control}
                name="oldPassword"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Old Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Current password"
                            {...field}
                            className="pr-10 bg-transparent outline-none border border-slate-600 focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={changePwForm.control}
                name="newPassword"
                render={({ field }) => {

                  return (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Old Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="New password"
                            {...field}
                            className="pr-10 bg-transparent outline-none border border-slate-600 focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="w-full flex items-center justify-end">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Update Password"}
                </motion.button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProfilPage