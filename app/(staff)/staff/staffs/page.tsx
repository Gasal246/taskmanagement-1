"use client";
import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetAllStaffsForStaff } from '@/query/business/queries';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const StaffList = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const { mutateAsync: GetStaffs, isPending } = useGetAllStaffsForStaff();

  const fetchStaffs = async () => {
    const cookieData = Cookies.get("user_role");
    if (!cookieData) {
      toast.error("Cookie not found");
      return;
    }

    try {
      const jsonData = JSON.parse(cookieData);
      const res = await GetStaffs(jsonData?._id);
      console.log("staff data: ", res?.data);

      if (res.status === 200) {
        // Combine all staff arrays and map to a consistent format
        const allStaff: any = [
          ...(res?.data?.area_heads || []),
          ...(res?.data?.area_staffs || []),
          ...(res?.data?.location_heads || []),
          ...(res?.data?.location_staffs || []),
          ...(res?.data?.region_staffs || []),
          ...(res?.data?.region_department_heads || []),
          ...(res?.data?.region_department_staffs || []),
          ...(res?.data?.area_department_heads || []),
          ...(res?.data?.location_department_heads || []),
          ...(res?.data?.location_department_staffs || [])
        ].map((item) => ({
          _id: item?.staff_id?._id || item.user_id?._id,
          name: item?.staff_id?.name || item?.user_id?.name,
          email: item?.staff_id?.email || item?.user_id?.email,
          phone: item?.staff_id?.phone || item?.user_id?.phone,
          role: item?.role || 'N/A',
          department: item.staff_id?.department || 'N/A', // Adjust based on actual data
          org: item.region_id ? `Region: ${item.region_id.region_name}` : item.area_id ? `Area: ${item.area_id.area_name}` : item.location_id ? `Location: ${item.location_id.location_name}` : item?.region_dep_id ? `Department: ${item?.region_dep_id?.dep_name}`: item?.reg_dep_id ? `Department: ${item?.reg_dep_id?.dep_name}` : item?.area_dep_id ? `Department: ${item?.area_dep_id?.dep_name}` : item?.location_dep_id ? `Department: ${item?.location_dep_id?.dep_name}` : "N/A" , // Adjust based on actual region data
        }));

        setUsers(allStaff);
      } else {
        toast.error(res?.message || "Failed to fetch staff data");
      }
    } catch (error) {
      toast.error("An error occurred while fetching staff data");
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  return (
    <div className="p-3 sm:p-5 overflow-y-auto min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-4 rounded-lg mb-2 border border-slate-700/50">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-medium text-xs sm:text-sm text-slate-300 flex items-center gap-1">
            <Users size={14} /> Staff List
          </h1>
        </div>

        {isPending && <p className="text-slate-300 text-center">Loading...</p>}

        {!isPending && users.length === 0 && (
          <p className="text-slate-300 text-center">No staff data available</p>
        )}

        {!isPending && users.length > 0 && (
          <>
            {/* Table layout for larger screens */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700">
                    <th className="p-2 sm:p-3 font-semibold">Name</th>
                    <th className="p-2 sm:p-3 font-semibold">Role</th>
                    <th className="p-2 sm:p-3 font-semibold">Department</th>
                    <th className="p-2 sm:p-3 font-semibold">Org</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((staff: any, index) => (
                    <motion.tr
                      key={index}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={()=> router.push(`staffs/${staff?._id}?role_id=${staff?.role}`)}
                    >
                      <td className="p-2 sm:p-3">{staff.name}</td>
                      <td className="p-2 sm:p-3">{staff.role}</td>
                      <td className="p-2 sm:p-3">{staff.department}</td>
                      <td className="p-2 sm:p-3">{staff.org}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card layout for mobile screens */}
            <div className="block sm:hidden space-y-3">
              {users.map((staff: any, index) => (
                <motion.div
                  key={index}
                  className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={()=> router.push(`staffs/${staff?._id}?role_id=${staff?.role}`)}
                >
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Name</p>
                      <p className="text-xs text-slate-300">{staff.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Role</p>
                      <p className="text-xs text-slate-300">{staff.role}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Department</p>
                      <p className="text-xs text-slate-300">{staff.department}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Org</p>
                      <p className="text-xs text-slate-300">{staff.org}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffList;