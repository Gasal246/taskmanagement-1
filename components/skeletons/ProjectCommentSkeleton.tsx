"useClient"
import React from 'react'
import { Skeleton } from '../ui/skeleton'

const ProjectCommentSkeleton = () => {
    return (
        <div className="flex flex-col gap-3">
            <div className='flex flex-col gap-1'>
                <div className="flex items-center gap-1 mb-1">
                    <Skeleton className='w-[28px] h-[28px] rounded-full' />
                    <Skeleton className='w-[280px] h-[14px] rounded-full' />
                </div>
                <div className="w-full flex flex-col gap-1">
                    <Skeleton className='w-full h-[12px] rounded-full' />
                    <Skeleton className='w-full h-[12px] rounded-full' />
                    <Skeleton className='w-1/2 h-[12px] rounded-full' />
                </div>
            </div>
            <div className='flex flex-col gap-1'>
                <div className="flex items-center gap-1 mb-1">
                    <Skeleton className='w-[28px] h-[28px] rounded-full' />
                    <Skeleton className='w-[280px] h-[14px] rounded-full' />
                </div>
                <div className="w-full flex flex-col gap-1">
                    <Skeleton className='w-full h-[12px] rounded-full' />
                    <Skeleton className='w-full h-[12px] rounded-full' />
                    <Skeleton className='w-1/2 h-[12px] rounded-full' />
                </div>
            </div>
        </div>
    )
}

export default ProjectCommentSkeleton