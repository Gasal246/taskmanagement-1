"use client"
import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DashboardIcon } from '@radix-ui/react-icons';

const SuperSidebar = () => {
    const pathname = usePathname();
    return (
        <div className={`w-full h-screen dark:bg-slate-900 bg-slate-400 overflow-hidden`}>
            <Link href="/superadmin">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname === '/superadmin' ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                    <DashboardIcon /> Inventory Insights
                </motion.button>
            </Link>
            <Link href="/superadmin/admins">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/admins') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                    <DashboardIcon /> Business Management
                </motion.button>
            </Link>
            <Link href="/superadmin/business-plans">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/business-plans') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                    <DashboardIcon /> Business Plans
                </motion.button>
            </Link>
            <Link href="/superadmin/roles">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${pathname.includes('/roles') ? 'dark:bg-cyan-950 bg-blue-400 border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                    <DashboardIcon /> Application Roles
                </motion.button>
            </Link>
        </div>
    )
}

export default SuperSidebar
