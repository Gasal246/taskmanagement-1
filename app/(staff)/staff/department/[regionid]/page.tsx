"use client"
import AddDepartmentArea from '@/components/staff/AddDepartmentArea'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'
import { Avatar } from 'antd'
import { LandPlot, LocateFixedIcon } from 'lucide-react'
import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DataTable } from './data-table'
import { columns } from './columns'

const StaffDepartmentRegion = ({ params }: { params: { regionid: string } }) => {
    const { data: session }: any = useSession();
    const router = useRouter();

    return (
        <div className='p-4'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/staff/department">Department Name</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>RegionName</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="bg-slate-950/50 rounded-lg p-3 my-3">
                <h1 className='flex items-center gap-1'><LandPlot size={18} /> Region India</h1>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 mb-3 flex flex-wrap items-center">
                <div className="w-full lg:w-1/2 p-1">
                    <div className="bg-slate-950/50 rounded-lg p-3">
                        <h1 className='text-xs text-cyan-500 leading-3'>Areas: <span className='text-xs text-slate-400'>5</span></h1>
                        <h1 className='text-xs text-cyan-500 leading-3'>Total Staffs: <span className='text-xs text-slate-400'>10</span></h1>
                        <h1 className='text-xs text-cyan-500 leading-3'>Average Count: <span className='text-xs text-slate-400'>2</span></h1>
                    </div>
                </div>
                <div className="w-full lg:w-1/2 p-1">
                    <div className="bg-slate-950/60 rounded-lg p-2">
                        <h1 className='text-xs text-cyan-600 mb-1'>Region Head</h1>
                        <div className="flex gap-2 items-center">
                            <Avatar src="/avatar.png" />
                            <div>
                                <h1 className='text-xs text-slate-400 leading-3'>Head Name</h1>
                                <h1 className='text-xs text-slate-400'>regionhead@gmail.com</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 mb-3">
                <div className="flex justify-between">
                    <h1 className='text-xs font-medium text-cyan-300'>Department Regions</h1>
                    <AddDepartmentArea currentUser={{}} allAreas={[]} />
                </div>
                <div className="flex flex-wrap">
                    <div className="w-full lg:w-3/12 p-1">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push(`/staff/department/regionid/areaid`)} className="bg-slate-950/50 rounded-lg p-2 cursor-pointer">
                            <h1 className='text-sm flex gap-1 items-center'><LocateFixedIcon size={18} /> Area Name</h1>
                        </motion.div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3">
                <h1 className='text-xs font-medium text-cyan-300'>Regional Staffs</h1>
                <DataTable data={[]} columns={columns} />
            </div>
        </div>
    )
}

export default StaffDepartmentRegion