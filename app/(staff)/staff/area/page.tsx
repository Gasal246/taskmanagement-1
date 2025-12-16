"use client"
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, User, Users, Tag, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetAreasForHeads } from '@/query/business/queries';

// Sample area data for a user
const sampleAreas = [
  {
    _id: "area1",
    name: "North India",
    area_id: "69ad38f96c46d60f8f530c7d",
    manager: "Anas Malik",
    staffCount: 18,
  },
  {
    _id: "area2",
    name: "South India",
    area_id: "69b514946678f1ccc106a1dc",
    manager: "Sarah Khan",
    staffCount: 12,
  },
  {
    _id: "area3",
    name: "West India",
    area_id: "69c123456789f1ccc106b1ef",
    manager: "John Doe",
    staffCount: 10,
  },
];

const UserAreasPage = () => {
  const router = useRouter();
  const {mutateAsync: fetchAreas, isPending} = useGetAreasForHeads();

  const fetchUserAreas = async () => {
    const res = await fetchAreas();
    console.log("Fetched Areas for Heads: ", res);
  }

  useEffect(()=> {
    fetchUserAreas();
  },[]);

  return (
    <div className="p-2 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50">
      <div className="w-full bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 sm:p-6 rounded-lg border border-slate-700/50">
        {/* Header with Back Button */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h1 className="font-medium text-sm sm:text-lg text-slate-300 flex items-center gap-2">
            <Map size={16} className="sm:w-5 sm:h-5" /> Areas Under User
          </h1>
          <button
            onClick={() => router.push('/staff')}
            className="flex items-center gap-1 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-slate-800/50"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" /> Back
          </button>
        </div>

        {/* No Areas Message */}
        {sampleAreas.length === 0 && (
          <p className="text-slate-300 text-center text-xs sm:text-sm py-4">No areas assigned to this user</p>
        )}

        {/* Detailed Card Layout */}
        {sampleAreas.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {sampleAreas.map((area) => (
              <motion.div
                key={area._id}
                className="bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-3 sm:p-4 rounded-md border border-slate-700 hover:border-cyan-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-700 pb-2 sm:pb-3">
                  <div className="p-1.5 sm:p-2 bg-slate-800 rounded-full">
                    <Map size={18} className="text-cyan-400 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-semibold text-slate-200">{area.name}</h2>
                    <p className="text-xs sm:text-sm text-slate-400">{area.area_id}</p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <User size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Area Manager</p>
                      <p className="text-sm sm:text-base text-slate-300">{area.manager}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Users size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Staff Count</p>
                      <p className="text-sm sm:text-base text-slate-300">{area.staffCount}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Tag size={14} className="text-slate-400 mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Area ID</p>
                      <p className="text-sm sm:text-base text-slate-300">{area.area_id}</p>
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

export default UserAreasPage;