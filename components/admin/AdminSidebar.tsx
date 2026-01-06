"use client"
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DashboardIcon } from '@radix-ui/react-icons'
import { Building2, CalendarCheck, EarthIcon, HandPlatter, PanelsTopLeft, ShieldQuestion, UsersIcon } from 'lucide-react'

type AdminSidebarProps = {
    variant?: "classic" | "modern";
};

const AdminSidebar = ({ variant = "modern" }: AdminSidebarProps) => {
    const pathname = usePathname();

    if (variant === "classic") {
        return (
            <div className={`w-full h-full dark:bg-slate-900 bg-slate-400 relative overflow-hidden`}>
                <Link href="/admin">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname === '/admin' ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <DashboardIcon /> Admin Dashboard
                    </motion.button>
                </Link>
                <Link href="/admin/staffs">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/staffs') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <UsersIcon size={18} /> Manage Staffs
                    </motion.button>
                </Link>
                <Link href="/admin/clients">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/clients') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <Building2 size={18} /> Manage Clients
                    </motion.button>
                </Link>
                {/* <Link href="/admin/departments">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/departments') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <SquareLibrary size={18} /> Manage Departments
                    </motion.button>
                </Link> */}
                <Link href="/admin/regions">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/regions') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <EarthIcon size={18} /> Manage Regions
                    </motion.button>
                </Link>
                <Link href="/admin/skills">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/skills') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <HandPlatter size={18} /> Manage Skills
                    </motion.button>
                </Link>
                <Link href="/admin/projects">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/projects') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex items-center justify-between hover:border-b hover:border-slate-700`}>
                        <div className="flex gap-2 items-center"><PanelsTopLeft size={18} /> Manage Projects</div> 
                    </motion.button>
                </Link>
                <Link href="/admin/tasks">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/tasks') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <CalendarCheck size={18} /> Manage Tasks
                    </motion.button>
                </Link>
                <Link href="/admin/enquiries">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/enquiries') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <ShieldQuestion size={18} /> Enquiry Manager
                    </motion.button>
                </Link>
            </div>
        )
    }

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
            {/* <Link href="/admin/departments">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/departments') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                    <SquareLibrary size={18} /> Manage Departments
                </motion.button>
            </Link> */}
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
