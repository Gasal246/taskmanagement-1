import Image from 'next/image'
import React from 'react'

const LoaderSpin = ({ size, title }:{ size: number, title?: string }) => {
  return (
    <div className='flex flex-col justify-center items-center gap-2'>
    <Image src={`/icons/loadingspin.svg`} width={size} height={size} alt='loading spin icon' />
    <span className='font-medium text-sm text-slate-300'>{title}</span>
    </div>
  )
}

export default LoaderSpin