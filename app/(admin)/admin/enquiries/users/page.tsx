"use client";

import React, { useState, useEffect } from "react";
import { Users, Eye } from "lucide-react";
import { Avatar } from "antd";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGetEqUsers } from "@/query/enquirymanager/queries";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const {data: users, isLoading} = useGetEqUsers(businessData?._id, "users");

  useEffect(()=>{
    console.log("users: ", users);
}, [users])

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

          {users?.users?.length === 0 && (
            <div className="w-full h-full flex items-center justify-center min-h-[10vh]">
              <p className="text-slate-300 text-sm">No users found</p>
            </div>
          )}

          {users?.users?.length > 0 && (
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
                {users?.users?.map((user:any) => (
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
        </div>
      </div>
    </div>
  );
}
