"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { useGetEnquiriesByAgent } from "@/query/enquirymanager/queries";
import { useRouter } from "next/navigation";


const UserEnquiriesPage = () => {
  const router = useRouter();
  const {data: enquiries, isLoading} = useGetEnquiriesByAgent();

  useEffect(() => {
    console.log("enquiries: ", enquiries);
    
  }, [enquiries]);

  return (
    <div className="p-4 pb-20">

      {/* Header */}
      <div className="flex justify-between items-center bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg">
        <h1 className="font-semibold text-md flex items-center gap-1 text-slate-200">
          <MessageSquare size={16} /> My Enquiries
        </h1>
<div className="flex gap-3">
<Link href="enquiries/assigned">
          <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 text-sm font-semibold flex gap-1 items-center"
          >
            <Plus size={16} /> Assigned to you
          </motion.button>
        </Link>

        <Link href="enquiries/add">
          <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 text-sm font-semibold flex gap-1 items-center"
          >
            <Plus size={16} /> Add Enquiry
          </motion.button>
        </Link>
</div>
      </div>

      {/* List Section */}
      <div className="mt-4 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg border border-slate-800">

        {enquiries?.enquiries?.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10">No enquiries found.</p>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-2 text-left">Camp</th>
                <th className="py-2 text-center">Status</th>
                <th className="py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {enquiries?.enquiries?.map((enquiry:any) => (
                <tr key={enquiry._id} className="border-b border-slate-800/60 hover:bg-slate-800/20"
                onClick={() => router.replace(`/enquiry/enquiries/${enquiry?._id}?from=created`)}
                >
                  <td className="py-2">{enquiry.camp_id.camp_name}</td>
                  <td className="py-2 text-center">
                    <span className={
                      enquiry.status === "Pending"
                        ? "text-red-400"
                        : enquiry.status === "In Progress"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }>
                      {enquiry.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">{new Date(enquiry.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {enquiries?.enquiries?.map((enquiry:any) => (
            <div 
              key={enquiry._id} 
              className="border border-slate-700 p-3 rounded-lg bg-slate-900/40"
            >
              <h2 className="text-sm font-semibold text-slate-200">{enquiry?.camp_id?.camp_name}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Status:{" "}
                <span className={
                  enquiry.status === "Open"
                    ? "text-green-400"
                    : enquiry.status === "In Progress"
                    ? "text-yellow-400"
                    : "text-red-400"
                }>
                  {enquiry.status}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Date: {enquiry.createdAt}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default UserEnquiriesPage;
