"use client"
import React, {  } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Badge, Tooltip } from 'antd'
import { ClipboardList, FolderGit2, Home, LandPlot, ShieldQuestionIcon, Users } from 'lucide-react'
import { usePathname } from 'next/navigation'
// import { useGetAllProjectAnalytics } from '@/query/client/analyticsQueries'

const EnquiryMobileBottomBar = () => {
    const pathname = usePathname();
  return (
    <div className="bg-black/90 w-full p-1 pt-2 flex items-center justify-center gap-5">
            <Link href="/enquiry">
                <Tooltip title="Home"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`${pathname === '/enquiry' ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                    <Home size={30} /></motion.button></Tooltip>
            </Link>
            <Link href="/enquiry/enquiries">
                <Tooltip title="Enquiries"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Badge count={0} size='small'><ShieldQuestionIcon size={30} className={`${pathname.includes('/enquiry/enquiries') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`} /></Badge>
                </motion.button></Tooltip>
            </Link>
        </div>
  )
}

export default EnquiryMobileBottomBar