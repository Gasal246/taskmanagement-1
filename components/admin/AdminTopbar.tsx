"use client"
import React, { useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import Image from 'next/image'
import { Bell, ListTodo } from 'lucide-react'
import { motion } from 'framer-motion'
import { ExitIcon } from '@radix-ui/react-icons'
import { signOut } from 'next-auth/react'
import { Avatar, Badge, Tooltip } from 'antd'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'
import NotificationPane from '../shared/NotificationPane'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import Cookies from "js-cookie";

const AdminTopbar = () => {
    const router = useRouter();
    const { businessData } = useSelector((state: RootState) => state.user);

    const logOut = async () => {
        Object.keys(Cookies.get()).forEach(cookieName => {
            Cookies.remove(cookieName);
        });
        signOut()
    }

    return (
        <div className='w-full h-16 dark:bg-slate-900 bg-slate-400 px-10 flex items-center fixed'>
            <div className="flex items-center justify-center gap-2">
                <Image src={'/logo.png'} alt='my_logo' width={35} height={35} />
                <h1 className='font-semibold text-nowrap time-font'>Task Manager</h1>
            </div>
            <div className="w-full flex justify-end">
                <NotificationPane trigger={
                    <div className='pt-2 cursor-pointer'>
                        <Tooltip title={'no new notifications.'}>
                            <Badge count={0} size='small'>
                                <Bell className='text-primary' size={20} />
                            </Badge>
                        </Tooltip>
                    </div>
                } />
                {
                    businessData &&
                    <Popover>
                        <PopoverTrigger>
                            <motion.div whileTap={{ scale: 0.98 }} className="px-3 flex gap-1 items-center hover:bg-black py-1 rounded-full">
                                <Avatar src={businessData?.business_logo || '/avatar.png'} />
                                <div className='text-start'>
                                    <h1 className='font-medium text-sm leading-4 text-slate-300'>{businessData?.business_name}</h1>
                                    <h1 className='font-medium text-xs text-slate-400'>{businessData?.business_email}</h1>
                                </div>
                            </motion.div>
                        </PopoverTrigger>
                        <PopoverContent className='w-40 p-2 space-y-2'>
                            <motion.button onClick={() => router.push(`/admin/profile`)} whileTap={{ scale: 0.98 }} className='w-full bg-secondary hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><Avatar src={businessData?.business_logo || '/avatar.png'} size={18} /> Profile </motion.button>
                            <motion.button onClick={() => router.push(`/admin/todo`)} whileTap={{ scale: 0.98 }} className='w-full bg-secondary hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><ListTodo size={16} /> Your ToDo </motion.button>
                            <AlertDialog>
                                <AlertDialogTrigger className='w-full'><motion.h1 whileTap={{ scale: 0.98 }} className='w-full bg-destructive text-destructive-foreground hover:bg-red-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><ExitIcon /> Sign Out</motion.h1></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Signing Out?</AlertDialogTitle>
                                        <AlertDialogDescription>Are you trying to signOut of application ?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => logOut()} >Yes</AlertDialogCancel>
                                        <AlertDialogAction>No</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </PopoverContent>
                    </Popover>
                }
            </div>
        </div>
    )
}

export default AdminTopbar