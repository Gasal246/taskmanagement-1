"use client"
import ProfilPageSkeleton from '@/components/skeletons/ProfilPageSkeleton'
import { Edit2, Key, EyeOff, Eye } from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { useGetStaffProfile, useUpdateStaffProfile } from '@/query/user/queries'
import Cookies from "js-cookie"
import { toast } from 'sonner'
import Cropper, { Area } from 'react-easy-crop'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/firebase/config'

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

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImageBlob = async (imageSrc: string, crop: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not supported.");
  }

  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to crop image."));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.92);
  });
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
const ProfilPage = () => {
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

  const [userData, setUserData] = useState<any>(null)
  const [creds, setCreds] = useState<any>({
    role_id: "",
    org_id: ""
  });

  // Modal States
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)

  const [showPassword, setShowPassword] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  //Api
  const { mutateAsync: GetProfile, isPending: loadingUser } = useGetStaffProfile();
  const { mutateAsync: UpdateProfile, isPending: isUpdating } = useUpdateStaffProfile();

  // Forms
  const editNameForm = useForm<z.infer<typeof editNameSchema>>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { name: "" }
  })

  const changePwForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "" }
  })

  const fetchUserProfile = async () => {
    const domainCookie = Cookies.get("user_domain");
    const roleCookie = Cookies.get("user_role");

    if (!domainCookie || !roleCookie) return toast.error("Cookies not Available");

    const domainJson = JSON.parse(domainCookie);
    const roleJson = JSON.parse(roleCookie);
    let org_id = "";
    switch (roleJson?.role_name) {
      case "REGION_HEAD":
        org_id = domainJson?.region_id;
        break;
      case "REGION_STAFF":
        org_id = domainJson?.region_id;
        break;
      case "AREA_HEAD":
        org_id = domainJson?.area_id;
        break;
      case "AREA_STAFF":
        org_id = domainJson?.area_id;
        break;
      case "LOCATION_HEAD":
        org_id = domainJson?.location_id;
        break;
      case "LOCATION_STAFF":
        org_id = domainJson?.location_id;
        break;
      case "REGION_DEP_HEAD":
        org_id = domainJson?.department_id;
        break;
      case "REGION_DEP_STAFF":
        org_id = domainJson?.department_id;
        break;
      case "AREA_DEP_HEAD":
        org_id = domainJson?.department_id;
        break;
      case "AREA_DEP_STAFF":
        org_id = domainJson?.department_id;
        break;
      case "LOCATION_DEP_HEAD":
        org_id = domainJson?.department_id;
        break;
      case "LOCATION_DEP_STAFF":
        org_id = domainJson?.department_id;
        break;
    }

    const res = await GetProfile({ role_id: roleJson?._id, org_id });

    if (res?.status == 200) {
      setUserData(res);
      const newCreds = {
        role_id: roleJson?._id,
        org_id: org_id
      };
      setCreds(newCreds);
    } else {
      toast.error(res?.message);
    }

  }

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarSrc) {
        URL.revokeObjectURL(avatarSrc);
      }
    };
  }, [avatarSrc]);

  const refetchUser = async () => {
    const res = await GetProfile({ role_id: creds.role_id, org_id: creds.org_id });
    if (res?.status == 200) setUserData(res);
  }

  // Open Modals
  const openEditName = () => {
    editNameForm.setValue("name", userData?.userData?.name)
    setEditNameOpen(true)
  }
  const openChangePw = () => {
    changePwForm.reset()
    setChangePwOpen(true)
  }

  const onAvatarCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const resetAvatarDialog = () => {
    setAvatarDialogOpen(false);
    setAvatarSrc(null);
    setAvatarFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleAvatarDialogChange = (open: boolean) => {
    if (!open) {
      resetAvatarDialog();
      return;
    }
    setAvatarDialogOpen(true);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size exceeds 5MB.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setAvatarSrc(nextUrl);
    setAvatarFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setAvatarDialogOpen(true);
  };

  const handleAvatarUpload = async () => {
    if (!avatarSrc || !avatarFile || !croppedAreaPixels) {
      toast.error("Select and crop an image first.");
      return;
    }
    if (!userData?.userData?._id) {
      toast.error("User information not available yet.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const croppedBlob = await getCroppedImageBlob(avatarSrc, croppedAreaPixels);
      const extension = avatarFile.type.split("/")[1] || "jpg";
      const storagePath = `user-avatars/${userData.userData._id}/${Date.now()}.${extension}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, croppedBlob, {
        contentType: avatarFile.type || "image/jpeg",
      });
      const url = await getDownloadURL(imageRef);
      const res = await UpdateProfile({ is_password: false, avatar_url: url });
      if (res?.status === 201) {
        toast.success("Profile photo updated.");
        await refetchUser();
        resetAvatarDialog();
      } else {
        toast.error(res?.message || "Failed to update profile photo.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Submit Handlers (Plug your logic here)
  const onEditNameSubmit = async (data: z.infer<typeof editNameSchema>) => {
    const payload = {
      is_password: false,
      name: data.name
    };
    const res = await UpdateProfile(payload);
    if (res.status == 201) {
      toast.success(res?.message);
    } else {
      await refetchUser();
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
      await refetchUser();
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

  const statusLabel = userData?.userData?.status === 1 ? "Active" : "Blocked";
  const avatarUrl = userData?.userData?.avatar_url || "/avatar.png";

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
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <h1 className='text-lg sm:text-xl md:text-2xl font-semibold text-slate-100'>{userData?.userData?.name}</h1>
                  <h1 className='text-sm sm:text-base font-medium text-slate-300'>{userData?.userData?.email}</h1>
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
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <motion.button
                  type="button"
                  onClick={openAvatarPicker}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 px-3 rounded-lg border border-slate-700 hover:border-cyan-600 text-xs font-semibold"
                >
                  Change Photo
                </motion.button>
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
              Your profile keeps your team aligned and your work visible at every level.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Organization Assignment</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Role</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.org_data?.role || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Department</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {userData?.org_data?.department?.dep_name
                        ? `${userData?.org_data?.department?.dep_name}${userData?.org_data?.department?.type ? ` (${userData?.org_data?.department?.type})` : ""}`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Region</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.org_data?.region?.region_name || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Area</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.org_data?.area?.area_name || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Location</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.org_data?.location?.location_name || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Professional Snapshot</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm text-slate-200 mt-1">{userData?.userData?.phone || "N/A"}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Joined</p>
                    <p className="text-sm text-slate-200 mt-1">{formatDate(userData?.userData?.createdAt)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Last Login</p>
                    <p className="text-sm text-slate-200 mt-1">{formatDate(userData?.userData?.last_login)}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="text-sm text-slate-200 mt-1">{statusLabel}</p>
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
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Skills</h2>
                {userData?.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userData?.skills?.map((skill: string, index: number) => (
                      <div
                        key={index}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950/60 rounded-md border border-slate-700"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-xs text-slate-400'>No skills found yet.</p>
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

      <Dialog open={avatarDialogOpen} onOpenChange={handleAvatarDialogChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>Crop the image to a square before uploading.</DialogDescription>
          </DialogHeader>
          <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
            {avatarSrc ? (
              <Cropper
                image={avatarSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onAvatarCropComplete}
                showGrid={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Select an image to preview.
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-cyan-600"
            />
          </div>
          <div className="flex w-full items-center justify-end gap-2">
            <motion.button
              type="button"
              onClick={resetAvatarDialog}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-400 text-sm font-semibold"
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={handleAvatarUpload}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? "Uploading..." : "Upload Photo"}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProfilPage
