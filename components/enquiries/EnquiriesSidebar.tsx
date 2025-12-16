"use client"
import { ShieldQuestionIcon } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Tooltip } from 'antd'
import { Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import React from 'react'

const EnquiriesSidebar = () => {
    const pathname = usePathname();
  return (
    <div className='w-full h-full bg-slate-900 relative'>
                <h1 className='text-center justify-center py-4 flex gap-2 items-center text-lg font-semibold'><Image src="/Elogo.png" alt='logo' width={30} height={30} /> Enquiry Manager</h1>
                <Link href="/enquiry">
                    <Tooltip title="Home" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname === '/enquiry' ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <Home size={18} /> Home
                    </motion.button></Tooltip>
                </Link>
                <Link href="/enquiry/enquiries">
                    <Tooltip title="Enquiries" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/enquiry/enquiries') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><ShieldQuestionIcon size={18} /> Enquiries</div> 
                    </motion.button></Tooltip>
                </Link>
            </div>
  )
}

export default EnquiriesSidebar