"use client"
import React, { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { Avatar } from 'antd';
import { Circle, CircleCheckBig } from 'lucide-react';

interface SectionSheetProps {
    trigger: React.ReactNode;
    title: string;
    selectedStaffs?: string[];
    section: 'department' | 'region' | 'area'
}

const SectionSheet = ({ trigger, title, section }: SectionSheetProps) => {
    const [selected, setSelected] = useState(false)
    const selectStaff = () => {
        setSelected(!selected)
    }

    return (
        <Sheet>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="min-w-full lg:min-w-[500px] border-slate-700">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>You could either select {section} head or particular staffs of this department. ( This is admin only functionality. )</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-2">
                    <h1 className='text-xs font-medium text-slate-400'>Head</h1>
                    <div className="select-none relative bg-slate-950 rounded-lg border border-slate-700 p-2 hover:bg-slate-800 flex gap-2" onClick={selectStaff}>
                        <Avatar size={30} src="/avatar.png" />
                        <div>
                            <h1 className="text-xs font-medium text-slate-300">Staff Name</h1>
                            <h1 className="text-xs text-slate-400">staff@gmail.com</h1>
                        </div>
                        {selected ?
                            <CircleCheckBig className='absolute right-2 top-2' size={15} color="#7DDA58" /> :
                            <Circle className='absolute right-2 top-2' size={15} color='gray' />
                        }
                    </div>
                    <h1 className='text-xs font-medium text-slate-400'>Staffs</h1>
                    <div className="select-none relative bg-slate-950 rounded-lg border border-slate-700 p-2 hover:bg-slate-800 flex gap-2" onClick={selectStaff}>
                        <Avatar size={30} src="/avatar.png" />
                        <div>
                            <h1 className="text-xs font-medium text-slate-300">Staff Name</h1>
                            <h1 className="text-xs text-slate-400">staff@gmail.com</h1>
                        </div>
                        {selected ?
                            <CircleCheckBig className='absolute right-2 top-2' size={15} color="#7DDA58" /> :
                            <Circle className='absolute right-2 top-2' size={15} color='gray' />
                        }
                    </div>
                </div>
            </SheetContent>
        </Sheet>

    )
}

export default SectionSheet