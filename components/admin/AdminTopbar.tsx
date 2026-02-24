"use client"
import React, { useCallback, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import Image from 'next/image'
import { Bell, ListTodo } from 'lucide-react'
import { motion } from 'framer-motion'
import { ExitIcon } from '@radix-ui/react-icons'
import { signOut } from 'next-auth/react'
import { Avatar, Badge, Tooltip } from 'antd'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'
import NotificationPane from '../shared/NotificationPane'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import Cookies from "js-cookie";
import { getBusinessByIdFunc } from '@/query/business/functions'
import { loadBusinessData } from '@/redux/slices/userdata'
import GoogleTranslate from '../shared/GoogleTranslate'

const AdminTopbar = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { businessData } = useSelector((state: RootState) => state.user);
    const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);
    const roleCookie = Cookies.get("user_role");
    const domainCookie = Cookies.get("user_domain");
    let roleLabel = "";
    let domainLabel = "";

    if (roleCookie) {
        try {
            const parsedRole = JSON.parse(roleCookie);
            roleLabel = parsedRole?.role_name || parsedRole?.role || "";
        } catch (error) {
            roleLabel = "";
        }
    }

    if (domainCookie) {
        try {
            const parsedDomain = JSON.parse(domainCookie);
            domainLabel =
                parsedDomain?.region_name ||
                parsedDomain?.area_name ||
                parsedDomain?.location_name ||
                parsedDomain?.dept_name ||
                parsedDomain?.name ||
                "";
        } catch (error) {
            domainLabel = "";
        }
    }

    const roleText = roleLabel ? `Role: ${roleLabel}` : "";
    const domainText = domainLabel ? `Domain: ${domainLabel}` : "";
    const roleDomainText = [roleText, domainText].filter(Boolean).join(" | ");

    const hydrateBusinessData = useCallback(async () => {
        const cookieValue = Cookies.get("user_domain");
        const businessId = cookieValue ? JSON.parse(cookieValue)?.value : null;
        if (!businessId) return;
        const res = await getBusinessByIdFunc(businessId);
        if (res?.data?.info) {
            dispatch(loadBusinessData(res.data.info));
        }
    }, [dispatch]);

    useEffect(() => {
        if (!businessData) {
            hydrateBusinessData();
        }
    }, [businessData, hydrateBusinessData]);

    const logOut = async () => {
        Object.keys(Cookies.get()).forEach(cookieName => {
            Cookies.remove(cookieName);
        });
        signOut()
    }

    return (
        <div className="w-full h-16 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center">
                    <Image src={'/logo.png'} alt='my_logo' width={35} height={35} />
                </div>
                <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Admin Console</p>
                    <h1 className="font-semibold text-sm text-slate-100 time-font">Task Manager</h1>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <GoogleTranslate
                    id="google_translate_admin"
                    variant="icon"
                    triggerLabel="Translate"
                    className="rounded-xl bg-slate-900/60 px-2 py-1.5 shadow-sm ring-1 ring-slate-800/80 transition-colors hover:bg-slate-900"
                />
                <NotificationPane trigger={
                    <div className="cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-800/60">
                        <Tooltip title={unreadCount <= 0 ? 'no new notifications.' : `${unreadCount} new notifications`}>
                            <Badge count={unreadCount} size='small'>
                                <Bell className='text-primary' size={20} />
                            </Badge>
                        </Tooltip>
                    </div>
                } />
                {
                    businessData &&
                    <Popover>
                        <PopoverTrigger>
                            <motion.div whileTap={{ scale: 0.98 }} className="px-3 py-2 flex gap-2 items-center rounded-2xl transition-colors hover:bg-slate-800/70">
                                <Avatar src={businessData?.business_logo || '/avatar.png'} />
                                <div className='text-start'>
                                    <h1 className='font-medium text-sm leading-4 text-slate-200'>{businessData?.business_name}</h1>
                                    <h1 className='font-medium text-xs text-slate-400'>{businessData?.business_email}</h1>
                                    {roleDomainText && (
                                        <h2 className='text-[10px] text-slate-500'>{roleDomainText}</h2>
                                    )}
                                </div>
                            </motion.div>
                        </PopoverTrigger>
                        <PopoverContent className='w-56 space-y-2 border border-slate-800/70 bg-slate-950/95 p-2 shadow-xl'>
                            <motion.button onClick={() => router.push(`/admin/profile`)} whileTap={{ scale: 0.98 }} className='w-full rounded-lg bg-secondary/70 px-2 py-1.5 text-sm flex gap-1 items-center justify-center transition-colors hover:bg-slate-800'>
                                <Avatar src={businessData?.business_logo || '/avatar.png'} size={18} /> Profile
                            </motion.button>
                            <motion.button onClick={() => router.push(`/admin/todo`)} whileTap={{ scale: 0.98 }} className='w-full rounded-lg bg-secondary/70 px-2 py-1.5 text-sm flex gap-1 items-center justify-center transition-colors hover:bg-slate-800'>
                                <ListTodo size={16} /> Your ToDo
                            </motion.button>
                            <AlertDialog>
                                <AlertDialogTrigger className='w-full'>
                                    <motion.h1 whileTap={{ scale: 0.98 }} className='w-full rounded-lg bg-destructive/90 text-destructive-foreground px-2 py-1.5 text-sm flex gap-1 items-center justify-center transition-colors hover:bg-red-700'>
                                        <ExitIcon /> Sign Out
                                    </motion.h1>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Signing Out?</AlertDialogTitle>
                                        <AlertDialogDescription>Are you trying to signOut of application ?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => logOut()} >Yes</AlertDialogCancel>
                                        <AlertDialogAction>No</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </PopoverContent>
                    </Popover>
                }
            </div>
        </div>
    )
}

export default AdminTopbar
