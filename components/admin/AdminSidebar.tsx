"use client"
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DashboardIcon } from '@radix-ui/react-icons'
import { Building2, CalendarCheck, EarthIcon, HandPlatter, PanelsTopLeft, ShieldQuestion, UsersIcon } from 'lucide-react'

const AdminSidebar = () => {
    const pathname = usePathname();

    const linkClasses = (active: boolean) =>
        [
            "w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
            "flex items-center gap-2",
            active
                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
        ].join(" ");

    return (
        <div className="flex h-full flex-col gap-1 text-sm">
            <Link href="/admin">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname === "/admin" ? "page" : undefined}
                    className={linkClasses(pathname === "/admin")}
                >
                    <DashboardIcon /> Admin Dashboard
                </motion.button>
            </Link>
            <Link href="/admin/staffs">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staffs") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staffs"))}
                >
                    <UsersIcon size={18} /> Manage Staffs
                </motion.button>
            </Link>
            <Link href="/admin/clients">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/clients") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/clients"))}
                >
                    <Building2 size={18} /> Manage Clients
                </motion.button>
            </Link>
            <Link href="/admin/regions">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/regions") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/regions"))}
                >
                    <EarthIcon size={18} /> Manage Regions
                </motion.button>
            </Link>
            <Link href="/admin/skills">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/skills") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/skills"))}
                >
                    <HandPlatter size={18} /> Manage Skills
                </motion.button>
            </Link>
            <Link href="/admin/projects">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/projects") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/projects"))}
                >
                    <PanelsTopLeft size={18} /> Manage Projects
                </motion.button>
            </Link>
            <Link href="/admin/tasks">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/tasks") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/tasks"))}
                >
                    <CalendarCheck size={18} /> Manage Tasks
                </motion.button>
            </Link>
            <Link href="/admin/enquiries">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/enquiries") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/enquiries"))}
                >
                    <ShieldQuestion size={18} /> Enquiry Manager
                </motion.button>
            </Link>
        </div>
    )
}

export default AdminSidebar
