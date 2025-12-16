"use client"
import React, { useEffect } from 'react';
import { Users, Mail, Phone, Briefcase, Building, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useGetSingleStaffById } from '@/query/business/queries';
import { string } from 'zod';

// Sample staff data
const sampleStaff = {
  _id: "68ad39e46c46d60f8f530bbd",
  name: "Anas Malik",
  email: "anasmalikp@gmail.com",
  phone: "8139004344",
  role: "Region Staff",
  department: "Operations",
  org: "Region: India (68ad38f96c46d60f8f530b7c)",
};

const StaffIdPage = () => {
  const router = useRouter();
  const params = useParams<{staffid: string}>();
  const searchParams = useSearchParams();
  const [userData, setUserData] = React.useState<any>(null);

  const {data: staffData, isLoading} = useGetSingleStaffById(params.staffid, searchParams.get("role_id")|| "");

  useEffect(()=>{
    console.log("staffData: ", staffData);
    setUserData({
      "name": staffData?.data?.staff_id ? staffData?.data?.staff_id?.name : staffData?.data?.user_id?.name,
      "email": staffData?.data?.staff_id ? staffData?.data?.staff_id?.email : staffData?.data?.user_id?.email,
      "phone": staffData?.data?.staff_id ? staffData?.data?.staff_id?.phone : staffData?.data?.user_id?.phone,
      "role": staffData?.role,
      "org": staffData?.data?.region_id ? `Region: ${staffData?.data?.region_id?.region_name}` :
              staffData?.data?.area_id ? `Area: ${staffData?.data?.area_id?.area_name}` :
              staffData?.data?.location_id ? `Location: ${staffData?.data?.location_id?.location_name}` :
              staffData?.data?.region_dep_id ? `Region ${staffData?.data?.region_dep_id?.region_id?.region_name}`:
              staffData?.data?.reg_dep_id ? `Region: ${staffData?.data?.reg_dep_id?.region_id?.region_name}` :
              staffData?.data?.area_dep_id ? `Area: ${staffData?.data?.area_dep_id?.area_id?.area_name}` : 
              staffData?.data?.location_dep_id ? `Location: ${staffData?.data?.location_dep_id?.location_id?.location_name}` : "",
      "department": staffData?.data?.reg_dep_id ? `Department: ${staffData?.data?.reg_dep_id?.dep_name}` :
                    staffData?.data?.region_dep_id ? `Department: ${staffData?.data?.region_dep_id?.dep_name}` :
                    staffData?.data?.area_dep_id ? `Department: ${staffData?.data?.area_dep_id?.dep_name}` :
                    staffData?.data?.location_dep_id ? `Department: ${staffData?.data?.location_dep_id?.dep_name}` : "",
    })
  }, [staffData]);

  return (
    <div className="p-3 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
      <div className="max-w-2xl mx-auto bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 sm:p-6 rounded-lg border border-slate-700/50">
        {/* Header with Back Button */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-medium text-sm sm:text-lg text-slate-300 flex items-center gap-2">
            <Users size={18} /> Staff Details
          </h1>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Staff List
          </button>
        </div>

        {/* Staff Details Card */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
            <div className="p-2 bg-slate-800 rounded-full">
              <Users size={24} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-200">{userData?.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{userData?.role}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-400">Email</p>
                <p className="text-sm text-slate-300">{userData?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone size={16} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-400">Phone</p>
                <p className="text-sm text-slate-300">{userData?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-400">Role</p>
                <p className="text-sm text-slate-300">{userData?.role}</p>
              </div>
            </div>
            {userData?.department &&(
              <div className="flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-400">Department</p>
                  <p className="text-sm text-slate-300">{userData?.department}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Building size={16} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-400">Organization</p>
                <p className="text-sm text-slate-300">{userData?.org}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffIdPage;