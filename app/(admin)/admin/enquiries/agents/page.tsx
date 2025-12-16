"use client"
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BadgeCheck, Eye, Filter, Hourglass, PencilRuler, Plus, Search, Users, Users2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetAgentsByBusiness } from '@/query/enquirymanager/queries';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';


const multiFormatDateString = (date: any) => {
  if (!date) return "Not Yet!"
  return new Date(date).toLocaleDateString()
}

const AgentsPage = () => {
  const router = useRouter();
  const [allStaffs, setAllStaffs] = useState<any[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [search, setSearch] = useState("");
  
    const { businessData } = useSelector((state: RootState) => state.user);
  const {data: agents, isLoading} = useGetAgentsByBusiness(businessData?._id, search);

  useEffect(() => {
    console.log("agents: ", agents);
    
  }, [agents]);

  const handleViewStaff = (user: any) => {
    router.replace(`/admin/enquiries/agents/${user}`);
  }

  const handleSearch = () => {
    setSearch(searchVal);
  }

  return (
    <div className='p-4 pb-10'>
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Agents</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
      <div className="flex justify-between items-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 m-1 rounded-lg">
        <h1 className='font-semibold text-md flex items-center gap-1'><Users size={16} /> Agents Management</h1>
        <Link href="/admin/enquiries/agents/add-agent">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer  text-sm font-semibold flex gap-1 items-center'>
            <Plus size={18} />
            Add Agent
          </motion.button>
        </Link>
      </div>

      <div className="w-full p-1">
        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg min-h-[40vh]">

          <div className='w-full flex items-center justify-between mb-3'>
            <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1"><Users2 size={16} /> Agents</h1>
          </div>

          <div className="w-full flex items-center gap-2 mb-2">
            <Tooltip title="search with email or name">
              <Input placeholder='Search Agents' className='border-slate-700 focus:border-slate-500' type='search' onChange={(e)=> setSearchVal(e.target.value)} />
            </Tooltip>
            <motion.div onClick={() =>handleSearch()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-semibold flex gap-1 items-center'>
              <Search size={14} />
              search
            </motion.div>
          </div>

          {(agents?.agents?.length === 0) && (
            <div className='w-full h-full flex items-center justify-center min-h-[10vh]'>
              <p className='text-slate-300 text-sm'>No agents found</p>
            </div>
          )}

          { agents?.agents?.length > 0 && (
            <table className="w-full bg-gradient-to-tr from-slate-950/40 to-slate-900/40 p-4 px-3 rounded-lg">
              <thead>
                <tr>
                  <th className='py-2 w-[40%] border border-slate-800'><div className="flex justify-center gap-1 text-sm text-slate-300"><Users size={16} /> Users</div></th>
                  <th className='py-2 w-[30%] border border-slate-800'><div className="flex justify-center gap-1 text-sm text-slate-300"><PencilRuler size={14} /> Actions</div></th>
                </tr>
              </thead>
              <tbody>
                {agents?.agents?.map((agent: any) => (
                  <tr key={agent._id}>
                    <td>
                      <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px]">
                        <Avatar size={40} src={agent?.avatar_url} />
                        <div>
                          <h1 className="font-semibold text-sm text-slate-300">{agent?.name}</h1>
                          <p className="text-xs text-slate-400">{agent?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <motion.div 
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }}
                        className='flex justify-center px-4 py-1 rounded-lg border border-slate-800 hover:border-slate-500 cursor-pointer text-xs font-semibold'
                        onClick={() => handleViewStaff(agent?._id)}
                      >
                        <Eye size={14} /> Details
                      </motion.div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentsPage;
