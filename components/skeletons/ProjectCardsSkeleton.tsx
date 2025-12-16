import React from 'react'
import { Skeleton } from "@/components/ui/skeleton"

const ProjectCardsSkeleton = () => {
  return (
    <div className='flex flex-wrap w-full'>
        <div className="w-full lg:w-4/12 p-1 overflow-hidden">
            <Skeleton className='w-full h-[200px] rounded-lg' />
        </div>
        <div className="w-full lg:w-4/12 p-1 overflow-hidden">
            <Skeleton className='w-full h-[200px] rounded-lg' />
        </div>
        <div className="w-full lg:w-4/12 p-1 overflow-hidden">
            <Skeleton className='w-full h-[200px] rounded-lg' />
        </div>
    </div>
  )
}

export default ProjectCardsSkeleton