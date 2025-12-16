import LoaderSpin from '@/components/shared/LoaderSpin'
import WifiLoader from '@/components/shared/WifiLoader'
import React from 'react'

export default function Loading() {
  return (
    <div className='w-full h-screen bg-black/20 items-center justify-center flex'><WifiLoader size={100} /></div>
  )
}

