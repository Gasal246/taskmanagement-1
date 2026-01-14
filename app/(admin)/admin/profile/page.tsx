"use client"
import ProfilPageSkeleton from '@/components/skeletons/ProfilPageSkeleton'
import { Edit2, Key, EyeOff, Eye } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { useGetAdminProfile, useUpdateStaffProfile } from '@/query/user/queries'
import Cookies from "js-cookie"
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import Image from 'next/image'
import { getBusinessByIdFunc } from '@/query/business/functions'

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

  const roleCookie = Cookies.get("user_role");
  const domainCookie = Cookies.get("user_domain");
  const parsedRole = roleCookie ? (() => {
    try {
      return JSON.parse(roleCookie);
    } catch (error) {
      return null;
    }
  })() : null;
  const parsedDomain = domainCookie ? (() => {
    try {
      return JSON.parse(domainCookie);
    } catch (error) {
      return null;
    }
  })() : null;
  const roleLabel = parsedRole?.role_name || parsedRole?.role || "N/A";
  const domainLabel =
    parsedDomain?.region_name ||
    parsedDomain?.area_name ||
    parsedDomain?.location_name ||
    parsedDomain?.dept_name ||
    parsedDomain?.name ||
    "N/A";

  // Modal States
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const [showPassword, setShowPassword] = React.useState(false);
  const [businessPlan, setBusinessPlan] = useState<any>(null);

  //Api
  const {data: userData, isLoading: loadingUser, refetch} = useGetAdminProfile(businessData?._id);
  const { mutateAsync: UpdateProfile, isPending: isUpdating } = useUpdateStaffProfile();

  useEffect(()=> {
    console.log("userData: ", userData);
  }, [userData]);

  useEffect(() => {
    const fetchBusinessPlan = async () => {
      if (!businessData?._id) {
        setBusinessPlan(null);
        return;
      }
      const res = await getBusinessByIdFunc(businessData?._id);
      if (res?.status === 200) {
        setBusinessPlan(res?.data?.plan || null);
      }
    };

    fetchBusinessPlan();
  }, [businessData]);

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

  const handleSwitchRole = () => {
    Cookies.remove("user_role");
    Cookies.remove("user_domain");
    window.location.href = "/select-roles";
  };

  const handleSwitchDomain = () => {
    Cookies.remove("user_domain");
    window.location.href = "/select-domain";
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  };

  const statusLabel = userData?.user_details?.status === 1 ? "Active" : "Blocked";
  const planInfo = businessPlan?.plan_id;

  return (
    <div className='w-full min-h-screen p-4 sm:p-6 space-y-4'>
      {loadingUser ? (
        <div className="flex w-full h-[70dvh] justify-center items-center">
          <ProfilPageSkeleton />
        </div>
      ) : userData ? (
        <>
          <div className="bg-gradient-to-tr from-slate-950/70 to-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              <div className="flex items-center gap-4">
                <div
                  className={`
                    w-[100px] h-[100px]
                    sm:w-[120px] sm:h-[120px]
                    md:w-[140px] md:h-[140px]
                    lg:w-[160px] lg:h-[160px]
                    rounded-full overflow-hidden border-4 border-slate-800 shadow-lg
                  `}
                >
                  <Image
                    src={userData?.user_details?.avatar_url || '/avatar.png'}
                    alt="Profile"
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <h1 className='text-lg sm:text-xl md:text-2xl font-semibold text-slate-100'>{userData?.user_details?.name}</h1>
                  <h1 className='text-sm sm:text-base font-medium text-slate-300'>{userData?.user_details?.email}</h1>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-[10px] uppercase tracking-wide bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-full text-slate-300">
                      Role: {roleLabel}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-full text-slate-300">
                      Domain: {domainLabel}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-full text-slate-300">
                      Status: {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                <motion.button
                  type="button"
                  onClick={openEditName}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 px-3 rounded-lg border border-slate-700 hover:border-cyan-600 text-xs font-semibold"
                >
                  <Edit2 size={14} className="inline mr-1" /> Edit Name
                </motion.button>
                <motion.button
                  type="button"
                  onClick={openChangePw}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 px-3 rounded-lg border border-slate-700 hover:border-cyan-600 text-xs font-semibold"
                >
                  <Key size={14} className="inline mr-1" /> Change Password
                </motion.button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Keep your profile current so your organization stays in sync and ready for what&apos;s next.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Professional Snapshot</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.user_details?.phone || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Last Login</p>
                    <p className="text-sm text-slate-200 mt-1">{formatDate(userData?.user_details?.last_login)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Joined</p>
                    <p className="text-sm text-slate-200 mt-1">{formatDate(userData?.user_details?.createdAt)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Last Logout</p>
                    <p className="text-sm text-slate-200 mt-1">{formatDate(userData?.user_details?.last_logout)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Business Profile</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Business Name</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.business_details?.business_name || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Business Email</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.business_details?.business_email || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Business Phone</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.business_details?.business_phone || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Location</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {userData?.business_details?.business_city || "N/A"}
                      {userData?.business_details?.business_country ? `, ${userData?.business_details?.business_country}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Role & Domain</h2>
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-400">Selected Role:</span> {roleLabel}</p>
                  <p><span className="text-slate-400">Selected Domain:</span> {domainLabel}</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <motion.button
                    type="button"
                    onClick={handleSwitchRole}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 rounded-lg border border-slate-700 hover:border-cyan-600 text-xs font-semibold"
                  >
                    Change Role
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleSwitchDomain}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 rounded-lg border border-slate-700 hover:border-cyan-600 text-xs font-semibold"
                  >
                    Change Domain
                  </motion.button>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Business Plan</h2>
                {planInfo ? (
                  <div className="space-y-2 text-sm text-slate-300">
                    <p className="text-base font-semibold text-slate-100">{planInfo?.plan_name}</p>
                    <p><span className="text-slate-400">Departments:</span> {planInfo?.deps_count ?? "N/A"}</p>
                    <p><span className="text-slate-400">Staff:</span> {planInfo?.staff_count ?? "N/A"}</p>
                    <p><span className="text-slate-400">Regions:</span> {planInfo?.region_count ?? "N/A"}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No plan assigned to this business yet.</p>
                )}
              </div>
            </div>
          </div>
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
                        New Password
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
