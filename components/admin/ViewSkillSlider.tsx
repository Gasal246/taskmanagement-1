/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { Avatar } from 'antd'
import { useGetSkillwiseUsers } from '@/query/client/staffQueries'

const ViewSkillSlider = ({ trigger, skill, companyid }: { trigger: React.ReactNode, skill: string, companyid: string }) => {
    const { data: allUsers, isLoading: loadingUsers, refetch: refetchStaffs } = useGetSkillwiseUsers(skill, companyid);

    return (
        <Sheet>
            <SheetTrigger>{trigger}</SheetTrigger>
            <SheetContent className="min-w-full lg:min-w-[600px] border-slate-700">
                <SheetHeader>
                    <SheetTitle className='capitalize font-medium text-lg'>Skill:  {skill}</SheetTitle>
                    <SheetDescription>There are (1) staffs with same skill.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-2 h-full pb-20 overflow-y-scroll">
                    {
                        allUsers?.map((user: any) => (
                            <div className='bg-slate-900 p-2 rounded-lg' key={user?._id}>
                                <div className="flex gap-2 items-center">
                                    <Avatar src={user?.AvatarUrl || `/avatar.png`} />
                                    <div>
                                        <h1 className='font-medium text-sm leading-3'>{user?.Name}</h1>
                                        <h1 className='font-medium text-xs leading-3'>{user?.Email}</h1>
                                    </div>
                                </div>
                                <div className="flex gap-1 ml-10 mt-1 flex-wrap">
                                    {
                                        user?.Skills?.map((sk: string) => (
                                            <span key={sk} className={`text-xs px-3 rounded-full ${sk == skill ? 'bg-orange-200' : 'bg-slate-100'} text-slate-950`}>{sk}</span>
                                        ))
                                    }
                                </div>
                            </div>
                        ))
                    }
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default ViewSkillSlider
