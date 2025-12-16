"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion';
import Link from 'next/link';
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { useGetBusinessStaffs } from '@/query/user/queries'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import { BadgeCheck, Eye, Filter, Hourglass, PencilRuler, Plus, Search, Users, Users2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from 'antd';
import { multiFormatDateString } from '@/lib/utils';
import { loadAdminBusinessStaff } from '@/redux/slices/application';
import { useRouter } from 'next/navigation';
import FilterStaffsSheet from '@/components/admin/FilterStaffsSheet';

const Staffs = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [allStaffs, setAllStaffs] = useState<any[]>([]);

  const { businessData } = useSelector((state: RootState) => state.user);
  const { filteredStaffs, staffFilterValues } = useSelector((state: RootState) => state.application);
  const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(businessData?._id);

  useEffect(() => {    
    if (staffFilterValues) {
      setAllStaffs(filteredStaffs || []);
    } else {
      setAllStaffs(loadedStaffs || []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedStaffs]);

  const handleViewStaff = async (user: any) => {
    dispatch(loadAdminBusinessStaff(user));
    router.push(`/admin/staffs/view-staff`);
  }
  
  return (
    <div className='p-4 pb-10'>
      <div className="flex justify-between items-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 m-1 rounded-lg">
        <h1 className='font-semibold text-md flex items-center gap-1'><Users size={16} /> Staff Management</h1>
        <Link href="/admin/staffs/add-staff">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer  text-sm font-semibold flex gap-1 items-center'>
            <Plus size={18} />
            Add Staff
          </motion.button>
        </Link>
      </div>
      <div className="w-full flex flex-wrap">
        <div className="w-full p-1">
          <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg min-h-[40vh]">
            <div className='w-full flex items-center justify-between mb-3'>
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1"><Users2 size={16} /> Business Users</h1>
              <FilterStaffsSheet
                trigger={
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='p-2 px-10 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-800 to-slate-900 cursor-pointer text-xs font-semibold flex gap-1 items-center'>
                    <Filter size={14} />
                    Filter
                  </motion.div>
                }
              />
            </div>
            {staffFilterValues && <div className="border border-slate-700 p-2 rounded-lg mb-2 border-dashed hover:border-slate-600 select-none">
              <h1 className="text-[10px] text-slate-400 mb-1">Filter Applied</h1>
              <div className="flex flex-wrap gap-1">
                {staffFilterValues?.regionName && <div className="border border-slate-700 p-1 px-4 rounded-lg border-dotted hover:border-slate-600 cursor-pointer min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Region</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.regionName}</p>
                </div>}
                {staffFilterValues?.areaName && <div className="border border-slate-700 p-1 px-4 rounded-lg border-dotted hover:border-slate-600 cursor-pointer min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Area</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.areaName}</p>
                </div>}
                {staffFilterValues?.locationName && <div className="border border-slate-700 p-1 px-4 rounded-lg border-dotted hover:border-slate-600 cursor-pointer min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Location</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.locationName}</p>
                </div>}
                {staffFilterValues?.skillName && <div className="border border-slate-700 p-1 px-4 rounded-lg border-dotted hover:border-slate-600 cursor-pointer min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Skill</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.skillName}</p>
                </div>}
              </div>
            </div>}
            <div className="w-full flex items-center gap-2 mb-2">
              <Tooltip title="search with email, phone or name"><Input placeholder='Search Users' className='border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0' type='search' /></Tooltip>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-semibold flex gap-1 items-center'>
                <Search size={14} />
                search
              </motion.div>
            </div>
            {loadingStaffData && <TableSkeleton />}
            {(!allStaffs || allStaffs?.length === 0) && <div className='w-full h-full flex items-center justify-center min-h-[10vh]'>
              <p className='text-slate-300 text-sm'>No staffs added</p>
            </div>}
            {allStaffs?.length > 0 && !loadingStaffData && <div className="w-full">
              <table className="w-full bg-gradient-to-tr from-slate-950/40 to-slate-900/40 p-4 px-3 rounded-lg">
                <thead>
                  <tr>
                    <th className='py-2 w-[40%] border border-slate-800'>
                      <div className="flex items-center justify-center gap-1 text-sm font-normal text-slate-300 ">
                        <Users size={16} />
                        Users
                      </div>
                    </th>
                    <th className='py-2 w-[25%] border border-slate-800'>
                      <div className="flex items-center justify-center gap-1 text-sm font-normal text-slate-300 ">
                        <BadgeCheck size={16} />
                        Status
                      </div>
                    </th>
                    <th className='py-2 w-[25%] border border-slate-800'>
                      <div className="flex items-center justify-center gap-1 text-sm font-normal text-slate-300 ">
                        <Hourglass size={14} />
                        Last Login
                      </div>
                    </th>
                    <th className='py-2 w-[30%] border border-slate-800'>
                      <div className="flex items-center justify-center gap-1 text-sm font-normal text-slate-300 ">
                        <PencilRuler size={14} />
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                {allStaffs?.map((staff: any) => <tr className="p-1" key={staff?._id}>
                  <td className=''>
                    <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px]">
                      <Avatar size={40} src={staff?.user_id?.avatar_url} />
                      <div className="flex flex-col">
                        <h1 className="font-semibold text-sm text-slate-300 leading-4">{staff?.user_id?.name}</h1>
                        <p className="text-xs text-slate-400 leading-1">{staff?.user_id?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className=''>
                    <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px]">
                      <h1 className={`font-semibold text-xs ${staff?.user_id?.status == 1 ? 'text-green-600' : staff?.user_id?.status == 2 ? 'text-yellow-600' : staff?.user_id?.status == 3 ? 'text-red-600' : 'text-gray-600'}`}>{staff?.user_id?.status == 1 ? "Active" : staff?.user_id?.status == 2 ? "On Leave" : staff?.user_id?.status == 3 ? "Suspended" : "Inactive"}</h1>
                    </div>
                  </td>
                  <td className=''>
                    <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px] justify-center">
                      <h1 className={`font-semibold text-xs text-slate-400 capitalize`}>{staff?.user_id?.last_login ? multiFormatDateString(staff?.user_id?.last_login) : "Not Yet!"}</h1>
                    </div>
                  </td>
                  <td className=''>
                    <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px]">
                      <motion.div 
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }}
                        className='flex group items-center gap-1 px-4 py-1 rounded-lg border border-slate-800 hover:border-slate-500 cursor-pointer text-xs font-semibold'
                        onClick={() => handleViewStaff(staff?.user_id)}
                      >
                        <Eye className='group-hover:text-cyan-500' size={14} />
                        Details
                      </motion.div>
                    </div>
                  </td>
                </tr>)}
                </tbody>
              </table>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Staffs