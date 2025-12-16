"use client"
import React from 'react'
import { Skeleton } from "@/components/ui/skeleton"
import LoaderSpin from '../shared/LoaderSpin'

const ProfilPageSkeleton = () => {
    return (
        <div className='flex flex-col w-full items-center justify-center p-5'>
            <div className='flex flex-col justify-center items-center space-y-1'>
                <Skeleton className='w-[120px] h-[120px] rounded-full' />
                <Skeleton className='w-[250px] h-[18px] rounded-full' />
                <Skeleton className='w-[300px] h-[18px] rounded-full' />
            </div>
            <div className="flex gap-2 mt-10 flex-wrap">
                <Skeleton className='w-[300px] h-[25px] rounded-md' />
                <Skeleton className='w-[300px] h-[25px] rounded-md' />
                <Skeleton className='w-[300px] h-[25px] rounded-md' />
            </div>
            <div className="mt-3">
                <LoaderSpin size={30} />
            </div>
        </div>
    )
}

export default ProfilPageSkeleton