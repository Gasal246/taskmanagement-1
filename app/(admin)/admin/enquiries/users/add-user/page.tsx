"use client";

import React, { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useGetBusinessStaffs } from "@/query/user/queries";
import { useAddEqUser } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
/* --------------------------------------------
        SAMPLE USERS
--------------------------------------------- */
export default function AddUserPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(businessData?._id);
  const {mutateAsync: AddUsers, isPending:isAdding} = useAddEqUser();

      useEffect(()=> {
        console.log("users: ", loadedStaffs);
      }, [loadedStaffs]);

  // Automatically match search text to user
  useEffect(() => {
    const found = loadedStaffs?.find(
      (u:any) =>
        `${u.user_id.name} (${u.user_id.email})`.toLowerCase() === search.toLowerCase()
    );
    setSelectedUser(found?.user_id || null);
  }, [search]);

  const handleAdd = async() => {
    if (!selectedUser) {
      alert("Please select a valid user.");
      return;
    }
    const data = {
        user_id: selectedUser?._id,
        business_id: businessData?._id
    };
    const res = await AddUsers(data);
    if(res?.status == 201){
        return toast.success(res?.message || "User added successfully");
    }
    return toast.error(res?.error || "Failed to add user");
  };

  return (
    <div className="p-5 pb-10">
      {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquries")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={()=> router.back()}>Manage Users</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Add User</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

      {/* HEADER */}
      <div className="flex justify-between items-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 m-1 rounded-lg">
        <h1 className="font-semibold text-md text-slate-300 flex items-center gap-1">
          <UserPlus size={16} /> Add User
        </h1>
      </div>

      <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg max-w-xl mx-auto mt-4">

        {/* SEARCH BAR + DATALIST */}
        <label className="text-xs text-slate-400">Search User</label>
        <input
          list="user-list"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type user name or email"
          className="w-full mt-1 p-2 rounded bg-slate-900/50 text-slate-200 border border-slate-700"
        />

        <datalist id="user-list">
          {loadedStaffs?.map((u:any) => (
            <option key={u.user_id._id} value={`${u.user_id.name} (${u.user_id.email})`} />
          ))}
        </datalist>

        {/* Preview selected user */}
        {selectedUser && (
          <div className="mt-4 p-3 border border-slate-700 rounded-lg bg-slate-900/40">
            <p className="text-sm text-slate-300">
              <strong>Name:</strong> {selectedUser.name}
            </p>
            <p className="text-sm text-slate-400">
              <strong>Email:</strong> {selectedUser.email}
            </p>
          </div>
        )}

        {/* ADD BUTTON */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="w-full mt-5 p-2 rounded-lg border border-slate-700 hover:border-slate-500 
          bg-gradient-to-tr from-slate-900 to-slate-800 text-sm font-semibold flex gap-2 justify-center items-center text-slate-200"
        >
          <UserPlus size={16} />
          Add User
        </motion.button>
      </div>
    </div>
  );
}
