import LoaderSpin from '@/components/shared/LoaderSpin'
import React from 'react'

export default function Loading() {
  return (
    <div className='w-full h-screen bg-black/20 items-center justify-center flex'><LoaderSpin size={80} /></div>
  )
}

