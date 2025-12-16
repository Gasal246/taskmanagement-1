"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, User, Users, Tag, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetDepartmentsForHeads } from '@/query/business/queries';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

// Sample department data for a user
const sampleDepartments = [
  {
    _id: "dept1",
    name: "Operations",
    head: "Anas Malik",
    employeeCount: 25,
    type: "Core",
  },
  {
    _id: "dept2",
    name: "Human Resources",
    head: "Sarah Khan",
    employeeCount: 10,
    type: "Support",
  },
  {
    _id: "dept3",
    name: "IT Support",
    head: "John Doe",
    employeeCount: 15,
    type: "Technical",
  },
];

const UserDepartmentsPage =() => {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const {mutateAsync: GetDepartments, isPending} = useGetDepartmentsForHeads();

  const fetchCookieData = async() => {
    const userCookie = Cookies.get("user_role");
    if(!userCookie) return toast.error("User role cookie not found");
    const userData = JSON.parse(userCookie);
    const res = await GetDepartments(userData?._id);
    if(res?.status != 200) return toast.error(res?.message || "Failed to fetch departments");
    const depts = [
        ...res?.data?.region_departments.map((item:any) => ({
            ...item,
            level: "Region Department",
        })),
        ...res?.data?.area_departments.map((item:any) => ({
            ...item,
            level: "Area Department",
        })),
        ...res?.data?.location_departments.map((item:any) => ({
            ...item,
            level: "Location Department",
        }))
    ]
    setDepartments(depts);
    console.log("departments: ", depts);
  }

  useEffect(()=> {
    fetchCookieData();
  }, []);

  return (
    <div className="p-2 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
      <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-6 rounded-lg border border-slate-700/50">
        {/* Header with Back Button */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h1 className="font-medium text-sm sm:text-lg text-slate-300 flex items-center gap-2">
            <Building size={16} className="sm:w-5 sm:h-5" /> Departments Under User
          </h1>
          <button
            onClick={() => router.push('/staff')}
            className="flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-slate-800/50"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" /> Back
          </button>
        </div>

        {/* No Departments Message */}
        {sampleDepartments.length === 0 && (
          <p className="text-slate-300 text-center text-xs sm:text-sm py-4">No departments assigned to this user</p>
        )}

        {/* Detailed Card Layout */}
        {departments?.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {departments?.map((dept) => (
              <motion.div
                key={dept._id}
                className="bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-3 sm:p-4 rounded-md border border-slate-700 hover:border-cyan-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-700 pb-2 sm:pb-3">
                  <div className="p-1.5 sm:p-2 bg-slate-800 rounded-full">
                    <Building size={18} className="text-cyan-400 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-semibold text-slate-200">{dept?.dep_name}</h2>
                    <p className="text-xs sm:text-sm text-slate-400">{dept?.type}</p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                  {/* <div className="flex items-start gap-2 sm:gap-3">
                    <User size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Department Head</p>
                      <p className="text-sm sm:text-base text-slate-300">N/A</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Users size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Employees</p>
                      <p className="text-sm sm:text-base text-slate-300">N/A</p>
                    </div>
                  </div> */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Tag size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Department Level</p>
                      <p className="text-sm sm:text-base text-slate-300">{dept?.level}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDepartmentsPage;