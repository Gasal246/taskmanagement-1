"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Users, Eye } from "lucide-react";
import { Avatar } from "antd";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGetEqUsers } from "@/query/enquirymanager/queries";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function UsersPage() {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const {data: users, isLoading} = useGetEqUsers(businessData?._id, "users");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(()=>{
    console.log("users: ", users);
}, [users])

  const userList = users?.users || [];
  const totalPages = Math.max(1, Math.ceil(userList.length / limit));
  const pagedUsers = userList.slice((page - 1) * limit, page * limit);

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

  const startIndex = userList.length === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, userList.length);

  useEffect(() => {
    setPage(1);
  }, [userList.length]);

  return (
    <div className="p-5 pb-10">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Users</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
      {/* HEADER */}
      <div className="flex justify-between items-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 m-1 rounded-lg">
        <h1 className="font-semibold text-md flex items-center gap-1 text-slate-300">
          <Users size={16} /> Users
        </h1>

        <Link href="/admin/enquiries/users/add-user">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 
            bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-sm font-semibold"
          >
            Add User
          </motion.button>
        </Link>
      </div>

      <div className="w-full p-1">
        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg min-h-[40vh]">
          <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1 mb-3">
            <Users size={16} /> User List
          </h1>

          {userList.length === 0 && (
            <div className="w-full h-full flex items-center justify-center min-h-[10vh]">
              <p className="text-slate-300 text-sm">No users found</p>
            </div>
          )}

          {userList.length > 0 && (
            <table className="w-full bg-gradient-to-tr from-slate-950/40 to-slate-900/40 p-4 px-3 rounded-lg">
              <thead>
                <tr>
                  <th className="py-2 w-[50%] border border-slate-800">
                    <div className="flex justify-center gap-1 text-sm text-slate-300">
                      Users
                    </div>
                  </th>
                  <th className="py-2 w-[30%] border border-slate-800">
                    <div className="flex justify-center gap-1 text-sm text-slate-300">
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {pagedUsers.map((user:any) => (
                  <tr key={user?._id}>
                    <td>
                      <div className="flex items-center gap-2 px-3 border rounded border-slate-800 p-1 min-h-[50px]">
                        <Avatar size={40} src="https://api.dicebear.com/7.x/personas/svg" />
                        <div>
                          <h1 className="font-semibold text-sm text-slate-300">
                            {user?.user_id?.name}
                          </h1>
                          <p className="text-xs text-slate-400">{user?.user_id?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex justify-center px-4 py-1 rounded-lg border border-slate-800 hover:border-slate-500 
                        cursor-pointer text-xs font-semibold text-slate-300"
                        onClick={() => router.replace(`/admin/enquiries/users/${user?.user_id?._id}`)}
                      >
                        <Eye size={14} /> Details
                      </motion.div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
              <p>
                Showing {startIndex}-{endIndex} of {userList.length} users · All set.
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
  );
}
