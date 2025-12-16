"use client"
import { useGetDeptsforLoation } from '@/query/business/queries';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, MapPin, Tag } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

const LocationsListPage = () => {
    const router = useRouter();
    const [depts, setDepts] = useState<any>(null);
    const params = useParams<{ locationid: string }>();
    const {mutateAsync: GetLocDepts, isPending} = useGetDeptsforLoation();

    const fetchDepts = async() => {
        const res = await GetLocDepts(params?.locationid);
        if(res?.status == 200){
            setDepts(res?.data);
        } else {
            toast.error(res?.message || "Error fetching data");
        }
    }

    useEffect(()=> {
        fetchDepts();
    }, []);
  return (
    <div className="p-2 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
          <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-6 rounded-lg border border-slate-700/50">
            {/* Region Header */}
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <h1 className="font-medium text-sm sm:text-lg text-slate-300 flex items-center gap-2">
                <MapPin size={16} className="sm:w-5 sm:h-5" /> Location: {depts?.location?.location_name}
              </h1>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-slate-800/50"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" /> Back
              </button>
            </div>

            <div>
          <h2 className="text-xs sm:text-sm font-semibold text-slate-400 flex items-center gap-2 mb-2 sm:mb-3">
            <Building2 size={14} className="sm:w-5 sm:h-5" /> Departments
          </h2>
          {depts?.location_departments?.length === 0 ? (
            <p className="text-slate-300 text-xs sm:text-sm">No departments in this Location</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {depts?.location_departments?.map((dept:any) => (
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
  )
}

export default LocationsListPage