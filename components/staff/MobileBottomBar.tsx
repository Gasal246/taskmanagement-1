"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Tooltip } from 'antd'
import { usePathname } from 'next/navigation'
import Cookies from 'js-cookie';
import { HEAD_ROLES } from '@/lib/constants';
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { getStaffNavItems } from './navItems';

const MobileBottomBar = () => {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>("");
    const { user_info } = useSelector((state: RootState) => state.application);
    const canViewEnquiry = Boolean(user_info?.is_eq_user);
    const isHead = HEAD_ROLES.includes(userRole);
    const isRegionHead = userRole === "REGION_HEAD";
    const navItems = getStaffNavItems({ canViewEnquiry, isHead, isRegionHead });

    const checkUserRole = () => {
        try{
            const cookieData = Cookies.get("user_role");
            if(!cookieData) return;
            const jsonData = JSON.parse(cookieData);
            setUserRole(jsonData?.role_name ?? "");
        }catch(err){
            setUserRole("");
        }
    }

    useEffect(()=>{
        checkUserRole();
    },[])
    const linkClasses = (active: boolean) =>
        [
            "inline-flex w-full min-w-0 items-center justify-center rounded-2xl px-0 transition-colors duration-150",
            active ? "bg-cyan-500/20 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]" : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
        ].join(" ");

    return (
        <div className="mx-auto w-full max-w-full">
            <div
                className="flex w-full items-center rounded-[26px] border border-white/20 bg-slate-900/50 shadow-[0_14px_35px_rgba(2,8,23,0.5)] ring-[0.5px] ring-white/5 backdrop-blur-2xl"
                style={{
                    gap: "clamp(0.35rem, 1.8vw, 1.125rem)",
                    paddingInline: "clamp(0.5rem, 3vw, 1rem)",
                    paddingBlock: "clamp(0.45rem, 2vw, 0.625rem)",
                }}
            >
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive(pathname);
                    return (
                        <Link key={item.href} href={item.href} className="flex-1 min-w-0">
                            <Tooltip title={item.label}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.96 }}
                                    className={linkClasses(active)}
                                    style={{ paddingBlock: "clamp(0.4rem, 1.8vw, 0.625rem)" }}
                                    aria-label={item.label}
                                >
                                    <Icon size={20} style={{ width: "clamp(1.125rem, 5vw, 1.5rem)", height: "clamp(1.125rem, 5vw, 1.5rem)" }} />
                                </motion.button>
                            </Tooltip>
                        </Link>
                    );
                })}
            </div>
        </div>
    )
}

export default MobileBottomBar
