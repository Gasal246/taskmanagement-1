"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Avatar } from "antd";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <div className="p-4 pb-10">
      <Breadcrumb>
        <BreadcrumbList className="text-sm flex items-center gap-1">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()} className="pl-2">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Manage Users</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="w-full p-1 space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-gradient-to-r from-cyan-950/35 via-slate-900/75 to-emerald-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Users size={18} className="text-cyan-300" /> Enquiry Users
            </h1>
            <p className="text-xs text-slate-400">
              Manage users assigned to enquiry workflows with clear visibility.
            </p>
          </div>
          <Link href="/admin/enquiries/users/add-user">
            <Button className="w-full sm:w-auto bg-cyan-700 hover:bg-cyan-600 text-white rounded-e-full rounded-s-lg">
              <Plus size={14} className="mr-1" /> Add User
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-950/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">User List</h2>
            <p className="text-xs text-slate-400">Total: {userList.length}</p>
          </div>

          {isLoading && (
            <div className="w-full h-full flex items-center justify-center min-h-[14vh] rounded-xl border border-slate-800/80 bg-slate-950/40">
              <p className="text-slate-300 text-sm">Loading users...</p>
            </div>
          )}

          {!isLoading && userList.length === 0 && (
            <div className="w-full h-full flex items-center justify-center min-h-[10vh] rounded-xl border border-slate-800/80 bg-slate-950/40">
              <p className="text-slate-300 text-sm">No users found</p>
            </div>
          )}

          {!isLoading && userList.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80">
              <table className="min-w-full text-sm text-slate-300">
                <thead className="bg-slate-900/90">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Email</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user: any, index: number) => (
                    <tr
                      key={user?._id}
                      className="group border-t border-slate-800/80 transition-colors hover:bg-gradient-to-r hover:from-cyan-950/20 hover:to-emerald-950/20"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400">{(page - 1) * limit + index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size={40} src="https://api.dicebear.com/7.x/personas/svg" />
                          <div>
                            <h1 className="font-medium text-slate-100">{user?.user_id?.name}</h1>
                            <p className="text-[11px] text-slate-400">Enquiry User</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{user?.user_id?.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="h-8 rounded-s-lg rounded-e-full border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 transition-all hover:border-cyan-500/70 hover:text-cyan-100 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3),0_8px_20px_-12px_rgba(6,182,212,0.8)]"
                            onClick={() => router.replace(`/admin/enquiries/users/${user?.user_id?._id}`)}
                          >
                            View <ArrowRight size={13} className="ml-1" />
                          </Button>
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
