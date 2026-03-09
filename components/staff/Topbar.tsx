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
import { useGetUserByUserIdWithMeta } from '@/query/user/queries';
import Cookies from "js-cookie";
import Image from 'next/image';
import GoogleTranslate from '../shared/GoogleTranslate';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { loadUserInfo } from '@/redux/slices/application';

const StaffTopbar = () => {
    const router = useRouter();
    const { data: session, status }: any = useSession();
    const dispatch = useDispatch();
    const [userData, setUserData] = useState<any>({});
    const [roleLabel, setRoleLabel] = useState("");
    const [domainLabel, setDomainLabel] = useState("");

    const formattedRoleLabel = roleLabel ? roleLabel.split('_').join(" ") : "";
    const formattedDomainLabel = domainLabel ? domainLabel.split('_').join(" ") : "";
    const roleText = roleLabel ? `Role: ${formattedRoleLabel}` : "";
    const domainText = domainLabel ? `Domain: ${formattedDomainLabel}` : "";
    const roleDomainText = [roleText, domainText].filter(Boolean).join(" | ");

    const { mutateAsync: GetuserData, isPending: userLoading } = useGetUserByUserIdWithMeta();
    const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            fetchUserData(session?.user?.id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session, roleLabel]);

    useEffect(() => {
        const roleCookie = Cookies.get("user_role");
        const domainCookie = Cookies.get("user_domain");

        if (roleCookie) {
            try {
                const parsedRole = JSON.parse(roleCookie);
                setRoleLabel(parsedRole?.role_name || parsedRole?.role || "");
            } catch (error) {
                setRoleLabel("");
            }
        } else {
            setRoleLabel("");
        }

        if (domainCookie) {
            try {
                const parsedDomain = JSON.parse(domainCookie);
                setDomainLabel(
                    parsedDomain?.region_name ||
                    parsedDomain?.area_name ||
                    parsedDomain?.location_name ||
                    parsedDomain?.dept_name ||
                    parsedDomain?.name ||
                    ""
                );
            } catch (error) {
                setDomainLabel("");
            }
        } else {
            setDomainLabel("");
        }
    }, []);

    const fetchUserData = async (user_id: string) => {
        const res = await GetuserData({ user_id, roleLabel });
        setUserData(res);
        dispatch(loadUserInfo(res || null));
    }

    const logOut = async () => {
        dispatch(loadUserInfo(null));
        Object.keys(Cookies.get()).forEach(cookieName => {
            Cookies.remove(cookieName);

            signOut()
        });
    }

    return (
        <div className='w-full px-4 py-2 md:h-16 md:py-0 flex justify-between items-center'>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 md:hidden">
                    <div className="flex h-10 w-10 items-center justify-center">
                        <Image src="/logo.png" alt="logo" width={35} height={35} />
                    </div>
                    <div className="leading-tight">
                        <h1 className="text-sm font-semibold text-slate-100 time-font">Task Manager</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {formattedRoleLabel || "STAFF CONSOLE"}
                        </p>
                    </div>
                </div>
                <div className="hidden items-center gap-3 md:flex">
                    <div className="flex h-10 w-10 items-center justify-center ">
                        <Image src="/logo.png" alt="logo" width={35} height={35} />
                    </div>
                    <div className="leading-tight">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{formattedRoleLabel || "STAFF CONSOLE"}</p>
                        <h1 className="text-sm font-semibold text-slate-100 time-font">Task Manager</h1>
                    </div>
                </div>
            </div>
            <div className='flex gap-3 items-center'>
                <GoogleTranslate
                    id="google_translate_staff"
                    variant="icon"
                    triggerLabel="Translate"
                    className="rounded-xl bg-slate-900/60 px-2 py-1.5 shadow-sm ring-1 ring-slate-800/80 transition-colors hover:bg-slate-900"
                />
                <NotificationPane trigger={
                    <div className='cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-800/60'>
                        <Tooltip title={unreadCount <= 0 ? 'no new notifications.' : `${unreadCount} new notifications`}>
                            <Badge count={unreadCount} size='small'>
                                <Bell className='text-primary' size={20} />
                            </Badge>
                        </Tooltip>
                    </div>
                } />
                {userData && <Popover>
                    <PopoverTrigger>
                        <div className='flex gap-2 items-center cursor-pointer rounded-2xl px-1 py-1 md:px-3 md:py-2 transition-colors hover:bg-slate-800/60'>
                            <div className='hidden md:block'>
                                <h1 className='text-slate-300 text-end text-sm leading-3'>{userData?.name}</h1>
                                <h2 className='text-slate-400 text-end text-xs'>{userData?.email}</h2>
                                {roleDomainText && (
                                    <p className='text-[10px] text-slate-500 text-end'>{roleDomainText}</p>
                                )}
                            </div>
                            <Avatar size={40} src={userData?.avatar_url || '/avatar.png'} />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className='w-64 md:w-[170px] p-2 space-y-2 border border-slate-800/70 bg-slate-950/95 shadow-xl'>
                        <div className='rounded-lg border border-slate-800/70 bg-slate-900/40 p-2 md:hidden'>
                            <h2 className='text-sm font-semibold text-slate-200'>{userData?.name || "-"}</h2>
                            <p className='text-xs text-slate-400'>{userData?.email || "-"}</p>
                            <p className='mt-1 text-[11px] text-slate-400'>
                                <span className='text-slate-500'>Role:</span> {formattedRoleLabel || "-"}
                            </p>
                            <p className='text-[11px] text-slate-400'>
                                <span className='text-slate-500'>Domain:</span> {formattedDomainLabel || "-"}
                            </p>
                        </div>
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
