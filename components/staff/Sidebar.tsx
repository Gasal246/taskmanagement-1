"use client"
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Tooltip } from 'antd'
import Cookies from 'js-cookie';
import { HEAD_ROLES } from '@/lib/constants'
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { getStaffNavItems } from './navItems';

const StaffSidebar = () => {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>("");
    const { user_info } = useSelector((state: RootState) => state.application);
    const canViewEnquiry = Boolean(user_info?.is_eq_user);
    const isHead = HEAD_ROLES.includes(userRole);
    const isRegionHead = userRole === "REGION_HEAD";
    const navItems = getStaffNavItems({ canViewEnquiry, isHead, isRegionHead });
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
            if(!cookieData) return;
            const jsonData = JSON.parse(cookieData);
            setUserRole(jsonData?.role_name ?? "");
        }catch(err){
            setUserRole("");
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
            {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(pathname);
                return (
                    <Link key={item.href} href={item.href}>
                        <Tooltip title={item.label} placement='right'>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                aria-current={active ? "page" : undefined}
                                className={linkClasses(active)}
                            >
                                <Icon size={18} /> {item.label}
                            </motion.button>
                        </Tooltip>
                    </Link>
                );
            })}
        </div>
    )
}

export default StaffSidebar
