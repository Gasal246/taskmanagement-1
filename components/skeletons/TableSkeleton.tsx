"use client"
import React from 'react'
import { Skeleton } from "@/components/ui/skeleton"

const TableSkeleton = () => {
    return (
        <div className='w-full p-3 bg-slate-950/50 rounded-lg'>
            <div className="flex justify-between mb-2">
                <Skeleton className='w-[350px] h-[30px]' />
                <Skeleton className='w-[200px] h-[30px]' />
            </div>
            <div className="w-full rounded-lg py-2">
                <Skeleton className='w-full h-[25px] mb-2' />
                <Skeleton className='w-full h-[25px] mb-2' />
                <Skeleton className='w-full h-[25px] mb-2' />
                <Skeleton className='w-full h-[25px] mb-2' />
                <Skeleton className='w-full h-[25px] mb-2' />
            </div>
            <div className="flex justify-end mt-2 gap-2">
                <Skeleton className='w-[100px] h-[30px]' />
                <Skeleton className='w-[100px] h-[30px]' />
            </div>
        </div>
    )
}

export default TableSkeleton