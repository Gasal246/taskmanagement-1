"use client"
import { Avatar } from 'antd';
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation';
import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from 'framer-motion';
import { CircleUser } from 'lucide-react';
import { ExitIcon } from '@radix-ui/react-icons';
import Cookies from "js-cookie";
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';

const StaffTopbar = () => {
  const router = useRouter();
  const userData = useSelector((state: RootState) => state.application.user_info);

  const logOut = async () => {
    Object.keys(Cookies.get()).forEach(cookieName => Cookies.remove(cookieName));
    signOut();
  };

  return (
    <div className='w-full bg-slate-900 p-1 flex justify-end items-center px-3'>
      <Popover>
        <PopoverTrigger>
          <div className='flex gap-1 items-center cursor-pointer'>
            <div>
              <h1 className='text-slate-400 text-end text-sm leading-3'>{userData?.name}</h1>
              <h2 className='text-slate-400 text-end text-xs'>{userData?.email}</h2>
            </div>
            <Avatar src={userData?.avatar_url || '/avatar.png'} />
          </div>
        </PopoverTrigger>

        <PopoverContent className='w-[120px] p-1 space-y-1'>
          <motion.button 
            onClick={() => router.push('/enquiry/profile')} 
            whileTap={{ scale: 0.98 }} 
            className='w-full bg-secondary hover:bg-slate-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'
          >
            <CircleUser size={16} strokeWidth={2} /> Profile
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={logOut}
            className='w-full bg-destructive text-destructive-foreground hover:bg-red-700 rounded-sm p-1 text-sm flex gap-1 items-center justify-center'
          >
            <ExitIcon /> Sign Out
          </motion.button>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default StaffTopbar;
