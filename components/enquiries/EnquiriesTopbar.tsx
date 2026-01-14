"use client"
import { Avatar } from 'antd';
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from 'framer-motion';
import { CircleUser } from 'lucide-react';
import { ExitIcon } from '@radix-ui/react-icons';
import { useGetUserByUserId } from '@/query/user/queries';
import Cookies from "js-cookie";

const StaffTopbar = () => {
  const router = useRouter();
  const { data: session, status }: any = useSession();
  const [userData, setUserData] = useState<any>({});

  const { mutateAsync: GetuserData } = useGetUserByUserId();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchUserData(session.user.id);
    }
  }, [status, session]);

  const fetchUserData = async (user_id: string) => {
    const res = await GetuserData(user_id);
    setUserData(res);
  }

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
