"use client"
import React, { useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import Image from 'next/image'
import { CircleUser } from 'lucide-react'
import { motion } from 'framer-motion'
import { ExitIcon } from '@radix-ui/react-icons'
import { signOut, useSession } from 'next-auth/react'
import { useGetSuperAdminById } from '@/query/superadmin/query'
import LoaderSpin from '../shared/LoaderSpin'
import { useDispatch } from 'react-redux'
import { loadSuperAdmin } from '@/redux/slices/userdata'

const SuperTopbar = () => {
    const { data: session }: any = useSession();
    const { data: superAdmin, isLoading: superAdminDataLoading } = useGetSuperAdminById(session?.user?.id);
    const dispatch = useDispatch();
    
    useEffect(() => {
        if (superAdmin) {
            dispatch(loadSuperAdmin(superAdmin));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [superAdmin])
    
    return (
        <div className='w-full h-16 dark:bg-slate-900 bg-slate-400 px-10 flex items-center fixed'>
            <div className="flex items-center justify-center gap-2">
                <Image src={'/logo.png'} alt='my_logo' width={30} height={30} />
                <div className='flex flex-col'>
                    <h1 className='font-bold text-nowrap leading-4'>Task Manager</h1> 
                    <h1 className='font-medium text-xs text-slate-400'>super admin</h1>
                </div>
            </div>
            <div className="w-full flex justify-end">
                {superAdminDataLoading && <LoaderSpin size={20} />}
                {superAdmin &&
                    <Popover>
                        <PopoverTrigger>
                            <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }} className="px-3 flex gap-1 items-center hover:bg-slate-950 rounded-full p-1">
                                <CircleUser size={25} />
                                <div>
                                    <h1 className='text-start font-medium text-sm leading-4 text-ellipsis text-slate-200'>{superAdmin?.name}</h1>
                                    <h1 className='text-start font-medium text-xs leading-2 text-slate-400'>{superAdmin?.email}</h1>
                                </div>
                            </motion.div>
                        </PopoverTrigger>
                        <PopoverContent className='w-40 p-2 space-y-2'>
                            <motion.button whileTap={{ scale: 0.98 }} className='w-full bg-secondary hover:bg-secondary/50 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><CircleUser size={16} strokeWidth={2} /> Profile </motion.button>
                            <motion.button onClick={() => signOut()} whileTap={{ scale: 0.98 }} className='w-full bg-destructive hover:bg-pink-900 text-destructive-foreground rounded-sm p-1 text-sm flex gap-1 items-center justify-center'><ExitIcon /> Sign Out</motion.button>
                        </PopoverContent>
                    </Popover>
                }
            </div>
        </div>
    )
}

export default SuperTopbar