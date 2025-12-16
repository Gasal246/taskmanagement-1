"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Pencil, Plus } from "lucide-react";
import { useGetEnquiryContacts } from "@/query/enquirymanager/queries";


export default function CampContactsPage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();

  const {data: contacts, isLoading} = useGetEnquiryContacts(params.enquiry_id);

  useEffect(()=> {
    console.log("contacts: ", contacts);
  },[contacts]);

  return (
    <div className="p-6 text-slate-200">

      {/* BACK BUTTON */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User size={20} /> Camp Contacts
        </h2>
      </div>

      {/* CONTACT LIST */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
        {contacts?.contacts?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">
            No contacts available.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-300 border-b border-slate-700">
              <tr className="text-left">
                <th className="py-2">Name</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Email</th>
                <th className="py-2">Designation</th>
                <th className="py-2">Authorization</th>
                <th className="py-2">Decision Maker</th>
              </tr>
            </thead>

            <tbody>
              {contacts?.contacts?.map((c:any) => (
                <tr
                  key={c._id}
                  className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                >
                  <td className="py-2">{c.contact_name}</td>
                  <td className="py-2">{c.contact_phone}</td>
                  <td className="py-2">{c.contact_email}</td>
                  <td className="py-2">{c.contact_designation}</td>
                  <td className="py-2">{c.contact_authorization}</td>
                  <td className="py-2">{c.is_decision_maker ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
