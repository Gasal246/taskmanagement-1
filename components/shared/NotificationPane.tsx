/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { Avatar } from 'antd'
import { multiFormatDateString } from '@/lib/utils'
import { useInView } from 'react-intersection-observer'

const NotificationCard = ({ notification }:{ notification: any }) => {
    // const { mutateAsync: notificationInview, isPending: notificationIsOpening } = useNotificationInview()
    const { ref, inView } = useInView();
    const handleNotificationInViewed = async () => {
        // const response = await notificationInview(notification?._id)
    }
    useEffect(() => {
        if (inView) {
            // handleNotificationInViewed();
        }
    }, [inView])

    return (
        <div ref={ref} className='bg-slate-950 border border-slate-700 p-2 rounded-md hover:bg-slate-900 cursor-pointer select-none'>
            <div className="flex justify-between items-center">
                <h5 className='text-xs text-slate-400 '>{multiFormatDateString(notification?.createdAt)}</h5>
                <div className='flex justify-between items-center gap-1'>
                    <Avatar src={notification?.SenderId?.AvatarUrl || '/avatar.png'} size={20} />
                    <h1 className='text-xs font-semibold'>{notification?.SenderId?.Email}</h1>
                </div>
            </div>
            <div>
                <h1 className='text-sm font-semibold'>{notification?.Title}</h1>
                <p className='text-xs'>{notification?.Description}</p>
            </div>
        </div>
    )
}

const NotificationPane = ({ trigger }: { trigger: React.ReactNode }) => {
    
    return (
        <Sheet>
            <SheetTrigger>{trigger}</SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Notifications.</SheetTitle>
                    <SheetDescription className='text-sm text-slate-400'>{`You have no notifications from past 30days`}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-2 h-full overflow-y-scroll py-3">
                    
                </div>
            </SheetContent>
        </Sheet>

    )
}

export default NotificationPane