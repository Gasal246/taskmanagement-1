import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Avatar } from 'antd'
import { LandPlot } from 'lucide-react'
import React from 'react'
import { DataTable } from './data-table'
import { columns } from './columns'

const StaffDepartmentRegionArea = ({ params }: { params: { regionid: string, areaid: string } }) => {
    return (
        <div className='p-4'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/staff/department">Department Name</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/staff/department/regionid">Region Name</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Area Name</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="bg-slate-950/50 rounded-lg p-3 my-3">
                <h1 className='flex items-center gap-1'><LandPlot size={18} /> Area Kerala</h1>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 mb-3 flex flex-wrap items-center">
                <div className="w-full lg:w-1/2 p-1">
                    <div className="bg-slate-950/60 rounded-lg p-2">
                        <h1 className='text-xs text-cyan-600 mb-1'>Area Head</h1>
                        <div className="flex gap-2 items-center">
                            <Avatar src="/avatar.png" />
                            <div>
                                <h1 className='text-xs text-slate-400 leading-3'>Head Name</h1>
                                <h1 className='text-xs text-slate-400'>areahead@gmail.com</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3">
                <h1 className='text-xs font-medium text-cyan-300'>Area Staffs</h1>
                <DataTable data={[]} columns={columns} />
            </div>
        </div>
    )
}

export default StaffDepartmentRegionArea