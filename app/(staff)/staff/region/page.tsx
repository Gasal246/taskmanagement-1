"use client"
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Users, Tag, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetAreasandDeptsForRegion } from '@/query/business/queries';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

// Sample API data (replace with actual API call in production)
const apiData = {
  message: 'Areas fetched successfully',
  status: 200,
  data: {
    areas: [
      {
        area_name: "Logi",
        region_id: "68ad38f96c46d60f8f530b7c",
        _id: "68ad39356c46d60f8f530b8d",
        business_id: "68a3ff6800b12b646a02972c",
        createdAt: "2025-08-26T04:33:57.320Z",
        updatedAt: "2025-08-26T04:33:57.320Z",
        status: 1,
        __v: 0,
      },
    ],
    region_departments: [
      {
        dep_name: "Kozhikkode",
        type: "rnd",
        region_id: "68ad38f96c46d60f8f530b7c",
        _id: "68ad39226c46d60f8f530b89",
        createdAt: "2025-08-26T04:33:38.876Z",
        updatedAt: "2025-08-26T04:33:38.876Z",
        status: 1,
        __v: 0,
      },
    ],
  },
};

const RegionSummaryPage = () => {
  const router = useRouter();
  const [areas_depts, setAreas_depts] = React.useState<any>(null);
  const regionId = "68ad38f96c46d60f8f530b7c"; // Hardcoded for demo, replace with dynamic value (e.g., router.query.id)
  const {mutateAsync: GetAreasDepts, isPending} = useGetAreasandDeptsForRegion();

  const fetchData = async() => {
      const cookieData = Cookies.get("user_domain");
      if(!cookieData) toast.error("Cookies not found");
      const domainData = JSON.parse(cookieData || '');
      const res = await GetAreasDepts(domainData?.region_id);
      if(res?.status == 200){
        setAreas_depts(res?.data);
        console.log("areaDepts: ", res?.data);
        
      }
    }

    useEffect(()=>{
        fetchData();
    },[]);

  // Process API data
  const region = {
    id: regionId,
    name: "India", // Placeholder, replace with actual region name if available
    areas: apiData.data.areas
      .filter((area) => area.region_id === regionId)
      .map((area) => ({
        _id: area._id,
        name: area.area_name,
        area_id: area._id,
        staffCount: 10, // Placeholder, replace with actual data if available
      })),
    departments: apiData.data.region_departments
      .filter((dept) => dept.region_id === regionId)
      .map((dept) => ({
        _id: dept._id,
        name: dept.dep_name,
        type: dept.type,
      })),
  };

  return (
    <div className="p-2 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
      <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-6 rounded-lg border border-slate-700/50">
        {/* Region Header */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h1 className="font-medium text-sm sm:text-lg text-slate-300 flex items-center gap-2">
            <MapPin size={16} className="sm:w-5 sm:h-5" /> Region: {region.name}
          </h1>
          <button
            onClick={() => router.push('/staff')}
            className="flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-slate-800/50"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" /> Back
          </button>
        </div>

        {/* Areas Section */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-400 flex items-center gap-2 mb-2 sm:mb-3">
            <MapPin size={14} className="sm:w-5 sm:h-5" /> Areas
          </h2>
          {areas_depts?.areas?.length === 0 ? (
            <p className="text-slate-300 text-xs sm:text-sm">No areas in this region</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {areas_depts?.areas?.map((area:any) => (
                <motion.div
                    onClick={()=> router.push(`/staff/region/${area?._id}`)}
                  key={area._id}
                  className="bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-3 sm:p-4 rounded-md border border-slate-700 hover:border-cyan-800"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 border-slate-700 ">
                    <div className="p-1.5 sm:p-2 bg-slate-800 rounded-full">
                      <MapPin size={18} className="text-cyan-400 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-semibold text-slate-200">{area?.area_name}</h3>
                      {/* <p className="text-xs sm:text-sm text-slate-400">{area.area_id}</p> */}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                    {/* <div className="flex items-start gap-2 sm:gap-3">
                      <Users size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Staff Count</p>
                        <p className="text-sm sm:text-base text-slate-300">{area.staffCount}</p>
                      </div>
                    </div> */}
                    {/* <div className="flex items-start gap-2 sm:gap-3">
                      <Tag size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Area ID</p>
                        <p className="text-sm sm:text-base text-slate-300">{area.area_id}</p>
                      </div>
                    </div> */}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Departments Section */}
        <div>
          <h2 className="text-xs sm:text-sm font-semibold text-slate-400 flex items-center gap-2 mb-2 sm:mb-3">
            <Building2 size={14} className="sm:w-5 sm:h-5" /> Departments
          </h2>
          {areas_depts?.region_departments?.length === 0 ? (
            <p className="text-slate-300 text-xs sm:text-sm">No departments in this region</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {areas_depts?.region_departments?.map((dept:any) => (
                <motion.div
                  key={dept._id}
                  className="bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-3 sm:p-4 rounded-md border border-slate-700 hover:border-cyan-800"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-700 pb-2 sm:pb-3">
                    <div className="p-1.5 sm:p-2 bg-slate-800 rounded-full">
                      <Building2 size={18} className="text-cyan-400 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-lg font-semibold text-slate-200">{dept?.dep_name}</h3>
                      <p className="text-xs sm:text-sm text-slate-400">{dept.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Tag size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Type</p>
                        <p className="text-sm sm:text-base text-slate-300">{dept.type.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionSummaryPage;