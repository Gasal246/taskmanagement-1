import LoaderSpin from '@/components/shared/LoaderSpin'
import ProfilPageSkeleton from '@/components/skeletons/ProfilPageSkeleton'
import React from 'react'

export default function Loading() {
  return (
    <div className='w-full h-[70dvh] bg-black/20 items-center justify-center flex'><ProfilPageSkeleton /></div>
  )
}

