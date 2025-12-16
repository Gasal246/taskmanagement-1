"use client"

import { Skeleton } from "@/components/ui/skeleton"

export const AdminCountBoxSkelton = () => {
    return (
        <div className="flex flex-wrap mt-5">
            <div className="w-full md:w-2/12 p-1">
                <Skeleton className="border-slate-600 border rounded-md aspect-auto h-[150px] w-full" />
            </div>
            <div className="w-full md:w-2/12 p-1">
                <Skeleton className="border-slate-600 border rounded-md aspect-auto h-[150px] w-full" />
            </div>
            <div className="w-full md:w-2/12 p-1">
                <Skeleton className="border-slate-600 border rounded-md aspect-auto h-[150px] w-full" />
            </div>
        </div>
    )
}

export const ProfileInfoSkelton = () => {
    return (
        <div className='flex items-center gap-1'>
            <Skeleton className="h-[60px] w-[60px] rounded-full" />
            <div className="space-y-1">
                <Skeleton className="w-[230px] h-[18px] rounded-full" />
                <Skeleton className="w-[180px] h-[15px] rounded-full" />
            </div>
        </div>
    )
}

export const DepartmentsLoadingSkelton = () => {
    return (
        <div className="flex gap-2">
            <Skeleton className="w-3/12 h-[160px]"></Skeleton>
            <Skeleton className="w-3/12 h-[160px]"></Skeleton>
            <Skeleton className="w-3/12 h-[160px]"></Skeleton>
        </div>
    )
}