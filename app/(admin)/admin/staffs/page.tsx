"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion';
import Link from 'next/link';
import TableSkeleton from '@/components/skeletons/TableSkeleton'
import { useGetBusinessStaffs } from '@/query/user/queries'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import { BadgeCheck, Eye, Filter, Hourglass, PencilRuler, Plus, Users, Users2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, Tooltip } from 'antd';
import { loadAdminBusinessStaff } from '@/redux/slices/application';
import { useRouter } from 'next/navigation';
import FilterStaffsSheet from '@/components/admin/FilterStaffsSheet';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Staffs = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [allStaffs, setAllStaffs] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { businessData } = useSelector((state: RootState) => state.user);
  const { staffFilterValues } = useSelector((state: RootState) => state.application);
  const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(
    businessData?._id,
    {
      includeBlocked: true,
      search: searchQuery,
      region_id: staffFilterValues?.region || "",
      area_id: staffFilterValues?.area || "",
      location_id: staffFilterValues?.location || "",
      skill_id: staffFilterValues?.skill || ""
    }
  );

  useEffect(() => {    
    setAllStaffs(loadedStaffs || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedStaffs]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, staffFilterValues, allStaffs.length]);

  const visibleStaffs = allStaffs;
  const hasSearch = Boolean(searchQuery.trim());

  const totalPages = Math.max(1, Math.ceil(visibleStaffs.length / limit));
  const pagedStaffs = visibleStaffs.slice((page - 1) * limit, page * limit);

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

  const startIndex = visibleStaffs.length === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, visibleStaffs.length);

  const getLastLoginLabel = (staff: any) => {
    const lastLogin = staff?.user_id?.last_login ? new Date(staff.user_id.last_login) : null;
    const lastLogout = staff?.user_id?.last_logout ? new Date(staff.user_id.last_logout) : null;

    const formatDay = (date: Date) => date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const formatTime = (date: Date) => {
      const hours24 = date.getHours();
      const hours12 = hours24 % 12 || 12;
      const minutes = `${date.getMinutes()}`.padStart(2, "0");
      const suffix = hours24 >= 12 ? "pm" : "am";
      return `${hours12}.${minutes}${suffix}`;
    };

    if (!lastLogin) {
      return "Not Logged In";
    }

    const dayLabel = formatDay(lastLogin);
    const loginTime = formatTime(lastLogin);
    const logoutTime = lastLogout ? formatTime(lastLogout) : null;

    return `${dayLabel} ${loginTime}${logoutTime ? ` to ${logoutTime}` : ""}`;
  };

  const getDesktopLastLoginLabel = (staff: any) => {
    const label = getLastLoginLabel(staff);
    const splitIndex = label.lastIndexOf(" ");

    if (splitIndex === -1 || label === "Not Logged In") {
      return label;
    }

    return `${label.slice(0, splitIndex)}\n${label.slice(splitIndex + 1)}`;
  };

  const handleViewStaff = async (user: any) => {
    dispatch(loadAdminBusinessStaff(user));
    router.push(`/admin/staffs/view-staff`);
  }

  useEffect(() => {
    const nextValue = searchValue.trim();
    const timeout = setTimeout(() => {
      setSearchQuery(nextValue);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchValue]);
  
  return (
    <div className='p-4 pb-10'>
      <div className="m-1 flex flex-col gap-3 rounded-lg bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className='font-semibold text-md flex items-center gap-1'><Users size={16} /> Staff Management</h1>
        <Link href="/admin/staffs/add-staff" className="w-full sm:w-auto">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 bg-gradient-to-tr from-slate-900 to-slate-800 p-2 px-4 text-sm font-semibold hover:border-slate-500 sm:w-auto'>
            <Plus size={18} />
            Add Staff
          </motion.button>
        </Link>
      </div>
      <div className="w-full flex flex-wrap">
        <div className="w-full p-1">
          <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg min-h-[40vh]">
            <div className='mb-3 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1"><Users2 size={16} /> Business Users</h1>
              <FilterStaffsSheet
                trigger={
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 bg-gradient-to-tr from-slate-800 to-slate-900 p-2 text-xs font-semibold hover:border-slate-500 sm:w-auto sm:px-10'>
                    <Filter size={14} />
                    Filter
                  </motion.div>
                }
              />
            </div>
            {staffFilterValues && <div className="border border-slate-700 p-2 rounded-lg mb-2 border-dashed hover:border-slate-600 select-none">
              <h1 className="text-[10px] text-slate-400 mb-1">Filter Applied</h1>
              <div className="flex flex-wrap gap-1">
                {staffFilterValues?.regionName && <div className="min-w-[130px] flex-1 rounded-lg border border-dotted border-slate-700 p-1 px-4 hover:border-slate-600 sm:flex-none sm:min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Region</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.regionName}</p>
                </div>}
                {staffFilterValues?.areaName && <div className="min-w-[130px] flex-1 rounded-lg border border-dotted border-slate-700 p-1 px-4 hover:border-slate-600 sm:flex-none sm:min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Area</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.areaName}</p>
                </div>}
                {staffFilterValues?.locationName && <div className="min-w-[130px] flex-1 rounded-lg border border-dotted border-slate-700 p-1 px-4 hover:border-slate-600 sm:flex-none sm:min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Location</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.locationName}</p>
                </div>}
                {staffFilterValues?.skillName && <div className="min-w-[130px] flex-1 rounded-lg border border-dotted border-slate-700 p-1 px-4 hover:border-slate-600 sm:flex-none sm:min-w-[150px]">
                  <h1 className="text-[10px] text-slate-400 ">Skill</h1>
                  <p className="text-[11px] text-slate-300 ">{staffFilterValues?.skillName}</p>
                </div>}
              </div>
            </div>}
            <div className="w-full flex items-center gap-2 mb-2">
              <Tooltip title="search with email, phone or name">
                <Input
                  placeholder='Search Users'
                  className='border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                  type='search'
                  value={searchValue}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSearchValue(nextValue);
                  }}
                />
              </Tooltip>
            </div>
            {loadingStaffData && <TableSkeleton />}
            {!loadingStaffData && visibleStaffs?.length === 0 && <div className='w-full h-full flex items-center justify-center min-h-[10vh]'>
              <p className='text-slate-300 text-sm'>{hasSearch ? "No matching staffs found" : "No staffs added"}</p>
            </div>}
            {visibleStaffs?.length > 0 && !loadingStaffData && <div className="w-full">
              <div className="space-y-3 md:hidden">
                {pagedStaffs?.map((staff: any) => (
                  <div key={staff?._id} className="rounded-lg border border-slate-800 bg-gradient-to-tr from-slate-950/40 to-slate-900/40 p-3">
                    <div className="flex items-start gap-3">
                      <Avatar size={40} src={staff?.user_id?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <h1 className="truncate font-semibold text-sm text-slate-300">{staff?.user_id?.name}</h1>
                        <p className="break-all text-xs text-slate-400">{staff?.user_id?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-800 p-2">
                        <h1 className="text-[10px] uppercase tracking-wide text-slate-500">Status</h1>
                        <p className={`mt-1 text-xs font-semibold ${staff?.user_id?.status === 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {staff?.user_id?.status === 1 ? "Active" : "Blocked"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-2">
                        <h1 className="text-[10px] uppercase tracking-wide text-slate-500">Last Login / Logout</h1>
                        <p className="mt-1 text-xs text-slate-300">{getLastLoginLabel(staff)}</p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className='mt-3 flex items-center justify-center gap-1 rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold hover:border-slate-500'
                      onClick={() => handleViewStaff(staff?.user_id)}
                    >
                      <Eye size={14} />
                      Details
                    </motion.div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] rounded-lg bg-gradient-to-tr from-slate-950/40 to-slate-900/40 p-4 px-3">
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
                        Last Login / Logout
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
                {pagedStaffs?.map((staff: any) => <tr className="p-1" key={staff?._id}>
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
                      <h1 className={`font-semibold text-xs ${staff?.user_id?.status === 1 ? 'text-green-600' : 'text-red-600'}`}>{staff?.user_id?.status === 1 ? "Active" : "Blocked"}</h1>
                    </div>
                  </td>
                  <td className=''>
                    <div className="flex flex-col items-center gap-0.5 px-3 border rounded border-slate-800 p-1 min-h-[50px] justify-center">
                      <h1 className="font-semibold text-[11px] text-slate-300 text-center whitespace-pre-line">
                        {getDesktopLastLoginLabel(staff)}
                      </h1>
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
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
                  <p>
                    Showing {startIndex}-{endIndex} of {visibleStaffs.length} staff members · All up to date.
                  </p>
                  <Pagination>
                    <PaginationContent className="flex-wrap justify-center">
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
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Staffs
