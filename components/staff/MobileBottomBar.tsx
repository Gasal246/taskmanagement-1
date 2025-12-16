"use client"
import React, { use, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Badge, Tooltip } from 'antd'
import { usePathname } from 'next/navigation'
import { AlarmClockCheck, ClipboardList, Codepen, FolderGit2, Home, LandPlot, Pyramid, Users } from 'lucide-react'
// import { useGetAllProjectAnalytics } from '@/query/client/analyticsQueries'
import { useSession } from 'next-auth/react'
import Cookies from 'js-cookie';
import { toast } from 'sonner'

const MobileBottomBar = () => {
    const pathname = usePathname();
    const { data: session }: any = useSession();

    const [isHead, setIsHead] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>("");

    const checkUserRole = () => {
        try{
            const cookieData = Cookies.get("user_role");
            if(!cookieData) return toast.error("Cookies not found");
            const jsonData = JSON.parse(cookieData);
            console.log("jsonData: ", jsonData);
            
            setIsHead(jsonData?.role_name?.endsWith("HEAD") ?? false);
            setUserRole(jsonData?.role_name ?? "");
        }catch(err){
            console.log("error on role check in botton bar: ", err);
            return toast.error("Something went wrong");
        }
    }

    useEffect(()=>{
        checkUserRole();
    },[])
    // const { data: projectsAnalytics, isLoading: loadingProjectAnalytics }: any = useGetAllProjectAnalytics(session?.user?.id, 'all');

    return (
        <div className="bg-black/90 w-full p-1 pt-2 flex items-center justify-center gap-5">
            <Link href="/staff">
                <Tooltip title="Home"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`${pathname === '/staff' ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                    <Home size={30} /></motion.button></Tooltip>
            </Link>
            <Link href="/staff/tasks">
                <Tooltip title="Tasks"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Badge count={0} size='small'><ClipboardList size={30} className={`${pathname.includes('/staff/tasks') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`} /></Badge>
                </motion.button></Tooltip>
            </Link>
            <Link href="/staff/projects">
                <Tooltip title="Projects"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Badge count={0} size='small'><FolderGit2 size={30} className={`${pathname.includes('/staff/projects') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`} /></Badge>
                </motion.button></Tooltip>
            </Link>
            {isHead && <>
                {/* <Link href="/staff/clients">
                    <Tooltip title="Clients"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`${pathname.includes('/staff/clients') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                        <Pyramid size={30} /></motion.button></Tooltip>
                </Link> */}
                <Link href="/staff/staffs">
                    <Tooltip title="Staffs"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`${pathname.includes('/staff/staffs') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                        <Users size={30} /></motion.button></Tooltip>
                </Link>
                {/* <Link href="/staff/department">
                    <Tooltip title="Department"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`${pathname.includes('/staff/department') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                        <Codepen size={30} /></motion.button></Tooltip>
                </Link> */}
                { userRole === "REGION_HEAD" &&(
                    <Link href="/staff/region">
                        <Tooltip title="Region"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className={`${pathname.includes('/staff/region') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                            <LandPlot size={30} /></motion.button></Tooltip>
                    </Link>
                )}
                {/* <Link href="/staff/area">
                    <Tooltip title="Area"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`${pathname.includes('/staff/area') ? 'text-white border-b-2 border-orange-300' : 'text-slate-500'}`}>
                        <LandPlot size={30} /></motion.button></Tooltip>
                </Link> */}
            </> 
            }
        </div>
    )
}

export default MobileBottomBar