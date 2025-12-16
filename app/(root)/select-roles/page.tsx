"use client"
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { getUserRolesAndDomains } from '@/query/user/function';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import LoaderSpin from '@/components/shared/LoaderSpin';

const SelectUserRole = () => {
    const session: any = useSession();
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const clearCookies = async () => {
        await Cookies.remove('next-auth.session-token');
        await Cookies.remove('next-auth.csrf-token');
    }

    const fetchUserRoles = async () => {
        setLoading(true);
        const userRoles = await getUserRolesAndDomains(session?.data?.user?.id);
        console.log(userRoles)
        setUserRoles(userRoles);
        setLoading(false);
    }

    useEffect(() => {
        if(!session?.data?.user) {
            clearCookies();
            redirect('/signin');
        } else {
            fetchUserRoles();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleContinueWithRole = async () => {
        setLoading(true);
        await Cookies.set('user_role', JSON.stringify(userRoles?.find((role: any) => role?.role_name == selectedRole)));
        if(selectedRole == "AGENT"){
            setLoading(false);
            redirect('/enquiry');
            return;
        }
        redirect('/select-domain');
    }


  return (
    <div className='h-screen w-full p-4 flex items-center justify-center flex-col'>
        <div className='w-full lg:w-1/2 bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 rounded-lg'>
            <h1 className='text-2xl font-medium'>Select Role</h1>
            <p className='text-sm text-slate-400'>select your role in this organization</p>
        </div>
        <div className="flex flex-col w-full lg:w-1/2 bg-gradient-to-tr max-h-[60dvh] overflow-y-scroll from-slate-950/50 to-slate-900/50 rounded-lg p-4 mt-2 space-y-2 items-center justify-center">
            {
                loading && <LoaderSpin size={40} />
            }
            {userRoles?.map((role: any) => (
                <motion.div 
                    key={role?._id} 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(role?.role_name)}
                    className={`bg-gradient-to-tr ${selectedRole == role?.role_name ? 'from-cyan-950/50 to-cyan-900/50' : 'from-slate-950/50 to-slate-900/50'} hover:border-cyan-700 border border-transparent select-none cursor-pointer p-4 rounded-lg w-full`}>
                    <h1 className='text-lg font-semibold'>{role?.role_name}</h1>
                    {selectedRole == role?.role_name && <p className='text-xs text-slate-400'>selected</p>}
                </motion.div>
            ))}
        </div>
        {selectedRole && (
            <div>
                <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContinueWithRole}
                    className='mt-2 bg-gradient-to-tr hover:bg-gradient-to-b from-slate-950 hover:from-cyan-950/50 hover:to-slate-950 to-cyan-950/50 select-none cursor-pointer p-4 rounded-lg w-full'
                >
                    <h1 className='text-sm font-medium text-center w-[200px]'>Continue</h1>
                </motion.div>
            </div>
        )}
    </div>
  )
}

export default SelectUserRole