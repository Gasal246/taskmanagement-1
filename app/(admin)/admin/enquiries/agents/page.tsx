"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Eye, Plus, Search, Users, Users2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetAgentsByBusiness } from '@/query/enquirymanager/queries';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AgentsPage = () => {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  
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

  const agentList = agents?.agents || [];
  const totalPages = Math.max(1, Math.ceil(agentList.length / limit));
  const pagedAgents = agentList.slice((page - 1) * limit, page * limit);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const tailSize = 5;
    const mainSize = 5;
    const tailStart = Math.max(totalPages - tailSize + 1, 1);
    let mainStart = page <= 5 ? 1 : page + 1;

    if (mainStart >= tailStart) {
      mainStart = tailStart;
    }
    let mainEnd = Math.min(mainStart + mainSize - 1, totalPages);
    if (mainEnd >= tailStart - 1) {
      mainEnd = tailStart - 1;
    }

    const items: Array<number | "ellipsis"> = [];
    for (let i = mainStart; i <= mainEnd; i += 1) {
      items.push(i);
    }
    if (mainEnd > 0 && mainEnd < tailStart - 1) {
      items.push("ellipsis");
    }
    for (let i = tailStart; i <= totalPages; i += 1) {
      items.push(i);
    }
    return items;
  }, [totalPages, page]);

  const startIndex = agentList.length === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, agentList.length);

  useEffect(() => {
    setPage(1);
  }, [search, agentList.length]);

  return (
    <div className='p-4 pb-10'>
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList className='text-sm flex items-center gap-1'>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()} className='pl-2'>Dashboard</BreadcrumbLink>
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

          {isLoading && (
            <div className='w-full h-full flex items-center justify-center min-h-[14vh] rounded-xl border border-slate-800/80 bg-slate-950/40'>
              <p className='text-slate-300 text-sm'>Loading agents...</p>
            </div>
          )}

          {!isLoading && (agents?.agents?.length === 0) && (
            <div className='w-full h-full flex items-center justify-center min-h-[10vh]'>
              <p className='text-slate-300 text-sm'>No agents found</p>
            </div>
          )}

          {!isLoading && agentList.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/70 via-slate-900/55 to-slate-950/70">
              <table className="min-w-full">
                <thead className="bg-slate-900/90">
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300'>
                      <div className="flex items-center gap-1.5"><Users size={14} /> Agent</div>
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300'>Email</th>
                    <th className='px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAgents.map((agent: any) => (
                    <tr key={agent._id} className="group border-t border-slate-800/80 hover:bg-gradient-to-r hover:from-cyan-950/20 hover:to-emerald-950/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size={40} src={agent?.avatar_url} />
                          <div>
                            <h1 className="font-semibold text-sm text-slate-200">{agent?.name}</h1>
                            <p className="text-[11px] text-slate-400">Enquiry Agent</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300">{agent?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className='inline-flex items-center gap-1 rounded-s-lg rounded-e-full border border-slate-700 bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-100 transition-all hover:border-cyan-500/70 hover:text-cyan-100 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3),0_8px_20px_-12px_rgba(6,182,212,0.8)]'
                            onClick={() => handleViewStaff(agent?._id)}
                          >
                            <Eye size={14} /> Details
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
              <p>
                Showing {startIndex}-{endIndex} of {agentList.length} agents · Looking good.
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((prev) => Math.max(prev - 1, 1));
                      }}
                      className={page === 1 ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                  {pageItems.map((item, index) => (
                    <PaginationItem key={`${item}-${index}`}>
                      {item === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((prev) => Math.min(prev + 1, totalPages));
                      }}
                      className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentsPage;
