"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Building2, CalendarSearch, PlusIcon, ScanSearch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from "date-fns";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { useGetAllBusinesses } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Tooltip } from 'antd';
import { useRouter } from 'next/navigation';

const AdminsManaging = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState<Date>();

    const [allBusiness, setAllBusiness] = useState<any[]>([]);
    const { data: allBusinesses, isLoading: allBusinessesLoading } = useGetAllBusinesses();

    useEffect(() => {
        if(allBusinesses?.data){
            setAllBusiness(allBusinesses?.data);
        }
    }, [allBusinesses])

    return (
        <div className='p-4 pb-10'>
            <div className="bg-slate-950/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Building2 size={20} />
                        <h1 className='font-semibold text-lg'>Business Management</h1>
                    </div>
                    <Link href="/superadmin/admins/add-admin">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='flex items-center gap-1 justify-center px-3 p-2 border border-slate-700 bg-gradient-to-bl from-cyan-900/50 to-cyan-950/50 rounded-lg cursor-pointer text-sm font-semibold'>
                            <PlusIcon size={18} />
                            <h1>Add Business</h1>
                        </motion.div>
                    </Link>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 justify-center w-[40%] bg-slate-950/50 px-2 rounded-lg">
                        <ScanSearch size={18} />
                        <div className="w-full">
                            <Input type="search" className='w-full p-0 m-0 outline-none border-none focus-visible:ring-0' placeholder='Search Business' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="">
                        {/* Add Filter By Date */}
                        <div className="flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[200px] lg:w-[280px] justify-start text-left font-normal bg-slate-950/50 hover:bg-slate-950/50",
                                    !date && "text-muted-foreground"
                                )}
                                >
                                <CalendarSearch className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-950/50 p-3 rounded-lg mt-1 min-h-[60vh]">
                <h1 className="font-semibold text-sm">{searchTerm ? `Results for "${searchTerm}"` : 'Your Businesses'}</h1>
                <div className="w-full flex flex-wrap">
                    {allBusiness?.length === 0 && !allBusinessesLoading && (
                        <div className="w-full flex justify-center items-center h-[30dvh]">
                            <Tooltip title="No Businesses added">
                                <h1 className="font-semibold text-sm text-slate-400">No Businesses added</h1>
                            </Tooltip>
                        </div>
                    )}
                    { allBusiness?.length > 0 && allBusiness?.map((business: any) => (
                        <div key={business?._id} className="w-full lg:w-4/12 p-1">
                        <motion.div onClick={() => router.push(`/superadmin/admins/${business?._id}`)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-gradient-to-bl from-slate-950/50 to-slate-800/50 p-3 rounded-lg border-slate-700 hover:border-cyan-800 border select-none cursor-pointer">
                            <h1 className="font-semibold text-sm">{business?.business_name}</h1>
                            <p className="text-xs text-slate-400">{business?.business_email}</p>
                            <p className="text-xs text-slate-400">{business?.business_phone}</p>
                            <p className="text-xs text-slate-400">{business?.business_country}, {business?.business_province}</p>
                            <p className="text-xs text-slate-400">{business?.business_city}, {business?.business_pin}</p>
                        </motion.div>
                    </div>
                    ))}
                    {allBusinessesLoading && (
                        <div className="w-full flex justify-center items-center h-[30dvh]">
                            <LoaderSpin size={80} />
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    )
}

export default AdminsManaging