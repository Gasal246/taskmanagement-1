"use client"
import TimeNow from '@/components/shared/TimeNow';
import { formatDateShortly, formatNumber } from '@/lib/utils';
import { Avatar, Tooltip } from 'antd';
import { ArrowRight, BellElectric, Contact, Globe2, LandPlot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { getBusinessByIdFunc } from '@/query/business/functions';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { loadBusinessData } from '@/redux/slices/userdata';

const AdminDashboard = () => {
  const motionref = useRef(null);
  const isMotionInView = useInView(motionref, { amount: 0.2 })
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { businessData } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!businessData) {
      fetchBusinessData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessData]);

  const fetchBusinessData = async () => {
    const bid = JSON.parse(Cookies.get("user_domain") || "")?.value;
    if (!bid) {
      return toast("Domain Not Found")
    }
    const res = await getBusinessByIdFunc(bid)
    console.log("businessData", res);
    
    if (res?.data) {
      dispatch(loadBusinessData(res?.data?.info))
    }
  }

  return (
    <>
      <div className='p-4 overflow-y-scroll pb-40 relative'>
        <div className='absolute top-0 left-0 w-full h-[80vh] flex flex-col justify-center items-center'>
          <h1 className='text-2xl font-bold text-center text-white'>Admin Dashboard</h1>
          <p className='text-sm font-semibold text-slate-300 text-center'>This page is under maintenace, you will be notified when it is ready.</p>
        </div>
        <div className="bg-gradient-to-b from-slate-950 to-transparent blur-sm">

        <motion.div
          ref={motionref}
          initial={{ opacity: 0, y: 50 }}
          animate={isMotionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.2 }}
          className={`flex justify-between p-3 bg-slate-950/50 rounded-lg mb-3 items-center flex-wrap `}>
          <h1 className='text-cyan-400'>Hi, <span className='text-white time-font'>Admin</span></h1>
          <div className="flex gap-2 flex-wrap">
            <Tooltip placement='left' title={<ArrowRight size={14} />}><div className='border border-slate-700 rounded-lg p-1 px-2 hover:bg-slate-950/20 cursor-pointer' onClick={() => router.push(`/admin/staffs`)}>
              <h1 className='text-sm font-medium flex items-center gap-1 text-cyan-400'><LandPlot size={14} /> Staffs</h1>
              <h2 className='text-xs text-slate-300 text-center font-medium'>{formatNumber(100)}</h2>
            </div></Tooltip>
            <Tooltip placement='left' title={<ArrowRight size={14} />}> <div className='border border-slate-700 rounded-lg p-1 px-2 hover:bg-slate-950/20 cursor-pointer' onClick={() => router.push(`/admin/departments`)}>
              <h1 className='text-xs font-medium flex items-center gap-1 text-cyan-400'><BellElectric size={14} />Departments</h1>
              <h2 className='text-sm text-slate-300 text-center font-medium'>{formatNumber(100)}</h2>
            </div></Tooltip>
            <Tooltip placement='left' title={<ArrowRight size={14} />}> <div className='border border-slate-700 rounded-lg p-1 px-2 hover:bg-slate-950/20 cursor-pointer' onClick={() => router.push(`/admin/regions`)}>
              <h1 className='text-xs font-medium flex items-center gap-1 text-cyan-400'><Contact size={14} /> Regions</h1>
              <h2 className='text-sm text-slate-300 capitalize text-center font-medium'>{formatNumber(100)}</h2>
            </div></Tooltip>
            <Tooltip placement='left' title={<ArrowRight size={14} />}><div className='border border-slate-700 rounded-lg p-1 px-2 hover:bg-slate-950/20 cursor-pointer' onClick={() => router.push(`/admin/areas`)}>
              <h1 className='text-xs font-medium flex items-center gap-1 text-cyan-400'><Globe2 size={14} /> Areas</h1>
              <h2 className='text-sm text-slate-300 text-center font-medium'>{formatNumber(100)}</h2>
            </div></Tooltip>
          </div>
        </motion.div>
        <motion.div
          ref={motionref}
          initial={{ opacity: 0, y: 50 }}
          animate={isMotionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-950/50 p-3 rounded-lg flex gap-1 justify-between mb-3 lg:flex-nowrap flex-wrap ">
          <div onClick={() => router.push(`/admin/tasks`)} className="bg-slate-950/50 p-2 px-3 rounded-lg w-full lg:w-1/2 border hover:border-slate-700 border-slate-900 select-none cursor-pointer">
            <h1 className='text-sm font-medium mb-1 flex items-center gap-1 text-cyan-500'>Tasks</h1>
            <div className="flex gap-2">
              <h1 className='lg:w-32 text-xs font-semibold p-1 px-3 border border-slate-500 rounded-lg'>New: {formatNumber(100) || 0}</h1>
              <h1 className='lg:w-32 text-xs font-semibold p-1 px-3 border border-slate-500 rounded-lg'>Ongoing: {formatNumber(100) || 0}</h1>
              <h1 className='lg:w-32 text-xs font-semibold p-1 px-3 border border-slate-500 rounded-lg'>Completed: {formatNumber(100) || 0}</h1>
            </div>
          </div>
          <div onClick={() => router.push(`/admin/projects`)} className="bg-slate-950/50 p-2 px-3 rounded-lg w-full lg:w-1/2 border hover:border-slate-700 border-slate-900 select-none cursor-pointer">
            <h1 className='text-sm font-medium mb-1 flex items-center gap-1 text-cyan-500'>Projects</h1>
            <div className="flex gap-2">
              <h1 className='lg:w-32 text-xs font-semibold p-1 px-3 border border-slate-500 rounded-lg'>Ongoing: {formatNumber(100) || 0}</h1>
              <h1 className=' text-xs font-semibold p-1 px-3 border border-slate-500 rounded-lg'>Waiting Approval: {formatNumber(100) || 0}</h1>
            </div>
          </div>
        </motion.div>
        <motion.div
          ref={motionref}
          initial={{ opacity: 0, y: 50 }}
          animate={isMotionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.2 }}
          className='mt-3 bg-slate-950/50 p-3 rounded-lg '>
          <div className="flex justify-between">
            <h1 className='text-sm text-cyan-500 font-medium flex gap-2 items-center'>Running <TimeNow /></h1>
            <h1 className='text-sm text-cyan-500 font-medium flex gap-2 items-center time-font'>{formatDateShortly(new Date().toISOString())}</h1>
          </div>
          <div className="w-full h-[500px] flex mt-2">
            <div className="w-2/3 h-full p-1">
              <div className="bg-slate-950/50 rounded-lg">
                {/* <DataTable columns={columns} data={payments} /> */}
              </div>
            </div>
            <div className="w-1/3 h-full p-1">
              <div className="bg-slate-950/50 rounded-lg w-full h-full gap-1 flex flex-col overflow-y-scroll p-3">
                <h1 className='text-center text-sm text-slate-300 mb-2'>Staffs Free Now</h1>
                <motion.div
                  ref={motionref}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isMotionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-800 hover:bg-slate-800/60  rounded-lg p-2 flex gap-1 select-none cursor-pointer" onClick={() => router.push(`/admin/staffs/${''}`)}>
                  <Avatar src={`/avatar.png`} />
                  <div className="">
                    <h1 className='text-xs font-medium text-slate-300'>Staff Name</h1>
                    <h1 className='text-xs text-slate-400'>staff123@gmail.com</h1>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </>
  )
}

export default AdminDashboard
