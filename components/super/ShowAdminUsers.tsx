"use client"
import React from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { Avatar } from 'antd'

const ShowAdminUsers = ({ trigger, adminData }: { trigger: React.ReactNode, adminData: any }) => {
    return (
        <Sheet>
            <SheetTrigger className='w-full'>{trigger}</SheetTrigger>
            <SheetContent side='bottom' className='h-screen lg:h-[90dvh] overflow-y-scroll pb-10'>
                <SheetHeader>
                    <SheetTitle>Showing Admin Users</SheetTitle>
                    <SheetDescription>
                        <div className="flex gap-1 items-center">
                            <Avatar src={adminData?.AdminId?.AvatarUrl || '/avatar.png'} />
                            <div>
                                <h1 className='text-sm leading-4 font-medium'>{adminData?.AdminId?.Name}</h1>
                                <h1 className='text-xs'>{adminData?.AdminId?.Email}</h1>
                            </div>
                        </div>
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-2 justify-center items-center mt-6">
                    {adminData?.adminUsers?.map((user: any) => (
                        <div className="bg-slate-800 hover:bg-slate-900 border border-slate-700 p-2 rounded-md w-full lg:w-[80%] gap-2 flex justify-between items-center" key={user?._id}>
                            <div className="flex gap-1 items-center lg:w-[250px]">
                                <Avatar src={user?.AvatarUrl || '/avatar.png'} />
                                <div>
                                    <h1 className='text-xs leading-3 font-medium'>{user?.Name}</h1>
                                    <h1 className='text-xs'>{user?.Email}</h1>
                                </div>
                            </div>
                            <h1 className='text-start text-xs lg:text-sm font-medium lg:w-[200px] capitalize'>{user?.Role}</h1>
                            <h1 className='text-end text-xs lg:text-sm font-medium lg:w-[200px]'>{user?.Region?.RegionName}, {user?.Area?.Areaname}</h1>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>

    )
}

export default ShowAdminUsers