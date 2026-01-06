"use client"
// import { useFindUserById, useGetAllNotifications } from '@/query/client/userQueries';
import { Avatar, Badge, Popconfirm, Tooltip } from 'antd';
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { motion } from 'framer-motion';
import { Bell, CircleUser } from 'lucide-react';
import { ExitIcon } from '@radix-ui/react-icons';
import NotificationPane from '../shared/NotificationPane';
import { useFindUserById, useGetUserByUserId } from '@/query/user/queries';
import Cookies from "js-cookie";
import Image from 'next/image';

type StaffTopbarProps = {
    variant?: "classic" | "modern";
};

const StaffTopbar = ({ variant = "modern" }: StaffTopbarProps) => {
    const router = useRouter();
    const { data: session, status }: any = useSession();
    const [userData, setUserData] = useState({});
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

    const { mutateAsync: GetuserData, isPending: userLoading } = useGetUserByUserId();
    // const { data: notifications, isLoading: notificationsLoading } = useGetAllNotifications(session?.user?.id);
    const [newNotifications, setNewNotifications] = useState(0);
    // useEffect(() => {
    //     if(notifications){
    //         const newest = notifications?.filter((notification: any) => notification?.IsOpened == false );
    //         setNewNotifications(newest?.length);
    //     }else{
    //         setNewNotifications(0);
    //     }
    // }, [notifications])

    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            fetchUserData(session?.user?.id);
        }
    }, [status, session]);

    const fetchUserData = async (user_id: string) => {
        const res = await GetuserData(user_id);
        setUserData(res);
    }

    const logOut = async () => {
        Object.keys(Cookies.get()).forEach(cookieName => {
            Cookies.remove(cookieName);

            signOut()
        });
    }

    if (variant === "classic") {
        return (
            <div className='w-full bg-slate-900 p-1 flex justify-between items-center px-3'>
                <div></div>
                <div className='flex gap-5 items-center'>
                    <NotificationPane trigger={
                        <div className='pt-2 cursor-pointer'>
                            <Tooltip title={newNotifications <= 0 ? 'no new notifications.' : `${newNotifications} new notifications`}>
                                <Badge count={newNotifications} size='small'>
                                    <Bell className='text-primary' size={20} />
                                </Badge>
                            </Tooltip>
                        </div>
                    } />
                    {userData && <Popover>
                        <PopoverTrigger>
                            <div className='flex gap-1 items-center cursor-pointer'>
                                <div>
                                    <h1 className='text-slate-400 text-end text-sm leading-3'>{userData?.name}</h1>
                                    <h2 className='text-slate-400 text-end text-xs'>{userData?.email}</h2>
                                    {roleDomainText && (
                                        <p className='text-[10px] text-slate-500 text-end'>{roleDomainText}</p>
                                    )}
                                </div>
                                <Avatar src={userData?.AvatarUrl || '/avatar.png'} />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className='w-[120px] p-1 space-y-1'>
                            <motion.button onClick={() => router.push(`/staff/profile`)} whileTap={{ scale: 0.98 }} className='w-full bg-secondary hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><CircleUser size={16} strokeWidth={2} /> Profile </motion.button>
                            <Popconfirm
                                title="SignOut  TaskManager"
                                description={`Hey!! ${userData?.name?.split(' ')[0]}, Are you trying to signOut of application ?`}
                                onConfirm={() => logOut()}
                                okText="Yes"
                                cancelText="No"
                                placement='bottomRight'
                            ><motion.h1 whileTap={{ scale: 0.98 }} className='w-full bg-destructive text-destructive-foreground hover:bg-red-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><ExitIcon /> Sign Out</motion.h1></Popconfirm>
                        </PopoverContent>
                    </Popover>}
                </div>
            </div>
        )
    }

    return (
        <div className='w-full h-16 px-4 flex justify-between items-center'>
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                    <Image src="/logo.png" alt="logo" width={18} height={18} />
                </div>
                <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Staff Console</p>
                    <h1 className="text-sm font-semibold text-slate-100 time-font">Task Manager</h1>
                </div>
            </div>
            <div className='flex gap-3 items-center'>
                <NotificationPane trigger={
                    <div className='cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-800/60'>
                        <Tooltip title={newNotifications <= 0 ? 'no new notifications.' : `${newNotifications} new notifications`}>
                            <Badge count={newNotifications} size='small'>
                                <Bell className='text-primary' size={20} />
                            </Badge>
                        </Tooltip>
                    </div>
                } />
                {userData && <Popover>
                    <PopoverTrigger>
                        <div className='flex gap-2 items-center cursor-pointer rounded-2xl px-3 py-2 transition-colors hover:bg-slate-800/60'>
                            <div>
                                <h1 className='text-slate-300 text-end text-sm leading-3'>{userData?.name}</h1>
                                <h2 className='text-slate-400 text-end text-xs'>{userData?.email}</h2>
                                {roleDomainText && (
                                    <p className='text-[10px] text-slate-500 text-end'>{roleDomainText}</p>
                                )}
                            </div>
                            <Avatar src={userData?.AvatarUrl || '/avatar.png'} />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[150px] p-2 space-y-2 border border-slate-800/70 bg-slate-950/95 shadow-xl'>
                        <motion.button onClick={() => router.push(`/staff/profile`)} whileTap={{ scale: 0.98 }} className='w-full rounded-lg bg-secondary/70 px-2 py-1.5 text-sm flex gap-1 items-center justify-center transition-colors hover:bg-slate-800'>
                            <CircleUser size={16} strokeWidth={2} /> Profile
                        </motion.button>
                        <Popconfirm
                            title="SignOut  TaskManager"
                            description={`Hey!! ${userData?.name?.split(' ')[0]}, Are you trying to signOut of application ?`}
                            onConfirm={() => logOut()}
                            okText="Yes"
                            cancelText="No"
                            placement='bottomRight'
                        ><motion.h1 whileTap={{ scale: 0.98 }} className='w-full rounded-lg bg-destructive/90 text-destructive-foreground px-2 py-1.5 text-sm flex gap-1 items-center justify-center transition-colors hover:bg-red-700'><ExitIcon /> Sign Out</motion.h1></Popconfirm>
                    </PopoverContent>
                </Popover>}
            </div>
        </div>
    )
}

export default StaffTopbar
