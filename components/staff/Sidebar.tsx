"use client"
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AlarmClockCheck, Captions, Home, Pyramid, ShieldQuestionIcon, Users } from 'lucide-react'
import { Tooltip } from 'antd'
import { signOut } from 'next-auth/react'
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { HEAD_ROLES } from '@/lib/constants'
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';

const StaffSidebar = () => {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>("");
    const { user_info } = useSelector((state: RootState) => state.application);
    const canViewEnquiry = Boolean(user_info?.is_eq_user);
    const linkClasses = (active: boolean) =>
        [
            "w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
            "flex items-center gap-2",
            active
                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
        ].join(" ");

    const checkRole = () => {
        try{
            const cookieData: any = Cookies.get("user_role");
            const domainData: any = Cookies.get("user_domain");
            if(!cookieData || !domainData) {
                toast.error("cookies not found");
                signOut();
            }
            const domainJson = JSON.parse(domainData);
            const jsonData = JSON.parse(cookieData);
            console.log("jsonData: ", jsonData);
            setUserRole(jsonData?.role_name ?? "");
        }catch(err){
            console.log("error on role check in botton bar: ", err);
            return toast.error("Something went wrong");
        }
    }

    useEffect(()=> {
        checkRole();
    },[]);

    return (
        <div className='w-full h-full'>
            <div className="flex items-center gap-3 px-2 pb-4">
                <div className="flex h-10 w-10 items-center justify-center">
                    <Image src="/logo.png" alt='logo' width={35} height={35} />
                </div>
                <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{"STAFF CONSOLE"}</p>
                    <h1 className="text-sm font-semibold text-slate-100">Workspace</h1>
                </div>
            </div>
            <Link href="/staff">
                <Tooltip title="Home" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname === "/staff" ? "page" : undefined}
                    className={linkClasses(pathname === "/staff")}>
                    <Home size={18} /> Home
                </motion.button></Tooltip>
            </Link>
            <Link href="/staff/tasks">
                <Tooltip title="Tasks" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/tasks") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/tasks"))}>
                    <AlarmClockCheck size={18} /> Tasks
                </motion.button></Tooltip>
            </Link>
            <Link href="/staff/projects">
                <Tooltip title="Projects" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/projects") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/projects"))}>
                    <Captions size={18} /> Projects
                </motion.button></Tooltip>
            </Link>
            {userRole =="REGION_HEAD" && (
                <Link href="/staff/region">
                <Tooltip title="Region" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/region") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/region"))}>
                    <Pyramid size={18} /> Region
                </motion.button></Tooltip>
            </Link>
            )}
            {HEAD_ROLES.includes(userRole) && (
                <Link href="/staff/staffs">
                <Tooltip title="Staffs" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/staffs") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/staffs"))}>
                    <Users size={18} /> Staffs
                </motion.button></Tooltip>
            </Link>
            )}
            {canViewEnquiry && (
                <Link href="/staff/enquiry">
                <Tooltip title="Enquiry" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/enquiry") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/enquiry"))}>
                    <ShieldQuestionIcon size={18} /> Enquiry
                </motion.button></Tooltip>
            </Link>
            )}
        </div>
    )
}

export default StaffSidebar
