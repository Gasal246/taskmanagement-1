"use client"
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AlarmClockCheck, Captions, Home, Pyramid, ShieldQuestionIcon, Users } from 'lucide-react'
import { Tooltip } from 'antd'
import { signOut } from 'next-auth/react'
import Cookies from 'js-cookie';
import { toast } from 'sonner'
// import { useGetAllProjectAnalytics, useGetAllTaskAnalytics } from '@/query/client/analyticsQueries'
// import { useFindUserById } from '@/query/client/userQueries'

type StaffSidebarProps = {
    variant?: "classic" | "modern";
};

const StaffSidebar = ({ variant = "modern" }: StaffSidebarProps) => {
    const pathname = usePathname();
    const [isHead, setIsHead] = useState<boolean>(false);
    const [isMarketing, setIsMarketing] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const linkClasses = (active: boolean) =>
        [
            "w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
            "flex items-center gap-2",
            active
                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
        ].join(" ");
    // const { data: staffData, isLoading: loadingStaff } = useFindUserById(session?.user?.id);
    // const { data: projectsAnalytics, isLoading: loadingProjectAnalytics }: any = useGetAllProjectAnalytics(session?.user?.id, 'all');
    // const { data: taskAnalytics, isLoading: loadingTaskAnalytics } = useGetAllTaskAnalytics(session?.user?.id);

    const checkRole = () => {
        try{
            const cookieData = Cookies.get("user_role");
            const domainData = Cookies.get("user_domain");
            if(!cookieData || !domainData) {
                toast.error("cookies not found");
                signOut();
            }
            const domainJson = JSON.parse(domainData);
            const jsonData = JSON.parse(cookieData);
            console.log("jsonData: ", jsonData);
            
            setIsHead(jsonData?.role_name?.endsWith("HEAD") ?? false);
            setIsMarketing(domainJson?.type == "marketing" || false);
            setUserRole(jsonData?.role_name ?? "");
        }catch(err){
            console.log("error on role check in botton bar: ", err);
            return toast.error("Something went wrong");
        }
    }

    useEffect(()=> {
        checkRole();
    },[]);

    if (variant === "classic") {
        return (
            <div className='w-full h-full bg-slate-900 relative'>
                <h1 className='text-center justify-center py-4 flex gap-2 items-center text-lg font-semibold'><Image src="/logo.png" alt='logo' width={30} height={30} /> TaskManager</h1>
                <Link href="/staff">
                    <Tooltip title="Home" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname === '/staff' ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700`}>
                        <Home size={18} /> Home
                    </motion.button></Tooltip>
                </Link>
                <Link href="/staff/tasks">
                    <Tooltip title="Tasks" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/tasks') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><AlarmClockCheck size={18} /> Tasks</div> 
                    </motion.button></Tooltip>
                </Link>
                <Link href="/staff/projects">
                    <Tooltip title="Projects" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/projects') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Captions size={18} /> Projects</div> 
                    </motion.button></Tooltip>
                </Link>
                {/* <Link href="/staff/clients">
                    <Tooltip title="Clients" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/clients') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Pyramid size={18} /> Clients</div>
                    </motion.button></Tooltip>
                </Link> */}
                {userRole =="REGION_HEAD" && (
                    <Link href="/staff/region">
                    <Tooltip title="Region" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/region') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Pyramid size={18} /> Region</div>
                    </motion.button></Tooltip>
                </Link>
                )}
                {userRole.endsWith("HEAD") && (
                    <Link href="/staff/staffs">
                    <Tooltip title="Staffs" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/staffs') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Users size={18} /> Staffs</div>
                    </motion.button></Tooltip>
                </Link>
                )}
                {
                    <Link href="/staff/enquiry">
                    <Tooltip title="Enquiry" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/enquiry') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><ShieldQuestionIcon size={18} /> Enquiry</div>
                    </motion.button></Tooltip>
                </Link>
                }
                {/* {staffData?.Role?.includes('head') && <Link href="/staff/staffs">
                    <Tooltip title="Staffs" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/staffs') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Users size={18} /> Staffs</div>
                    </motion.button></Tooltip>
                </Link>}
                {staffData?.Role == 'dep-head' && <Link href="/staff/department">
                    <Tooltip title="Department" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/department') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><Codepen size={18} /> Deparment</div>
                    </motion.button></Tooltip>
                </Link>} */}
                {/* {(staffData?.Role == 'region-head' || staffData?.Role == 'dep-head') && <Link href="/staff/region">
                    <Tooltip title="Region" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/region') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><LandPlot size={18} /> Region</div>
                    </motion.button></Tooltip>
                </Link>}
                {staffData?.Role?.includes('head') && <Link href="/staff/area">
                    <Tooltip title="Area" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className={`text-sm ${pathname.includes('/staff/area') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                        <div className="flex gap-1"><LandPlot size={18} /> Area</div>
                    </motion.button></Tooltip>
                </Link>} */}
            </div>
        )
    }

    return (
        <div className='w-full h-full'>
            <div className="flex items-center gap-3 px-2 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                    <Image src="/logo.png" alt='logo' width={18} height={18} />
                </div>
                <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Staff</p>
                    <h1 className="text-sm font-semibold text-slate-100">Workspace</h1>
                </div>
            </div>
            <Link href="/staff">
                <Tooltip title="Home" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname === "/staff" ? "page" : undefined}
                    className={linkClasses(pathname === "/staff")}>
                    <Home size={18} /> Home
                </motion.button></Tooltip>
            </Link>
            <Link href="/staff/tasks">
                <Tooltip title="Tasks" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/tasks") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/tasks"))}>
                    <AlarmClockCheck size={18} /> Tasks
                </motion.button></Tooltip>
            </Link>
            <Link href="/staff/projects">
                <Tooltip title="Projects" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/projects") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/projects"))}>
                    <Captions size={18} /> Projects
                </motion.button></Tooltip>
            </Link>
            {/* <Link href="/staff/clients">
                <Tooltip title="Clients" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`text-sm ${pathname.includes('/staff/clients') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                    <div className="flex gap-1"><Pyramid size={18} /> Clients</div>
                </motion.button></Tooltip>
            </Link> */}
            {userRole =="REGION_HEAD" && (
                <Link href="/staff/region">
                <Tooltip title="Region" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/region") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/region"))}>
                    <Pyramid size={18} /> Region
                </motion.button></Tooltip>
            </Link>
            )}
            {userRole.endsWith("HEAD") && (
                <Link href="/staff/staffs">
                <Tooltip title="Staffs" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/staffs") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/staffs"))}>
                    <Users size={18} /> Staffs
                </motion.button></Tooltip>
            </Link>
            )}
            {
                <Link href="/staff/enquiry">
                <Tooltip title="Enquiry" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    aria-current={pathname.includes("/staff/enquiry") ? "page" : undefined}
                    className={linkClasses(pathname.includes("/staff/enquiry"))}>
                    <ShieldQuestionIcon size={18} /> Enquiry
                </motion.button></Tooltip>
            </Link>
            }
            {/* {staffData?.Role?.includes('head') && <Link href="/staff/staffs">
                <Tooltip title="Staffs" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`text-sm ${pathname.includes('/staff/staffs') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                    <div className="flex gap-1"><Users size={18} /> Staffs</div>
                </motion.button></Tooltip>
            </Link>}
            {staffData?.Role == 'dep-head' && <Link href="/staff/department">
                <Tooltip title="Department" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`text-sm ${pathname.includes('/staff/department') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                    <div className="flex gap-1"><Codepen size={18} /> Deparment</div>
                </motion.button></Tooltip>
            </Link>} */}
            {/* {(staffData?.Role == 'region-head' || staffData?.Role == 'dep-head') && <Link href="/staff/region">
                <Tooltip title="Region" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`text-sm ${pathname.includes('/staff/region') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                    <div className="flex gap-1"><LandPlot size={18} /> Region</div>
                </motion.button></Tooltip>
            </Link>}
            {staffData?.Role?.includes('head') && <Link href="/staff/area">
                <Tooltip title="Area" placement='right'><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`text-sm ${pathname.includes('/staff/area') ? 'bg-primary text-primary-foreground font-semibold border-b border-slate-700' : 'dark:bg-slate-800 bg-slate-50'} w-full p-2 font-medium text-start flex gap-2 items-center hover:border-b hover:border-slate-700 justify-between`}>
                    <div className="flex gap-1"><LandPlot size={18} /> Area</div>
                </motion.button></Tooltip>
            </Link>} */}
        </div>
    )
}

export default StaffSidebar
