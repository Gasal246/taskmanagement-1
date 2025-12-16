/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

const WarningPage = () => {
  const router = useRouter()
  const session = useSession()
  useEffect(() => {
    if (session?.status !== 'authenticated') {
      router.replace('/signin')
    }
  }, [session])
  return (
    <div className='w-full h-screen bg-black flex flex-col items-center justify-center space-y-3'>
      <h1 className='text-3xl font-black text-red-600'>WARNING!</h1>
      <h3 className="text-xl font-bold text-pink-600">Sorry!! Some Pages Are Only For Authorized Parties.</h3>
      <Button onClick={() => signOut()}>Signout</Button>
    </div>
  )
}

export default WarningPage