"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, PhoneCall, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useGetEqLatestActionForStaff } from "@/query/enquirymanager/queries";

// Sample fetched data (replace with real API later)
const sampleEnquiryHistory = {
  action: "Visit", // or "Call"
  priority: 6,
  assignedTo: "Ahmed Khan",
  feedback: "Customer wants us to visit after 5PM.",
  createdAt: "2025-11-29T10:23:00Z",
  next_step_date: "2025-12-06T00:00:00Z",
  camp_name: "Blue Sky Labour Camp",
};

export default function StaffEnquiryActionPage() {
  const params = useParams<{ enquiry_id: string }>();
  const router = useRouter();

  const {data: action, isLoading} = useGetEqLatestActionForStaff(params.enquiry_id);

  useEffect(()=> {
    console.log("action: ", action);
  }, [action]);

  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    // Later replace with real fetch:
    setHistory(sampleEnquiryHistory);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 text-slate-300">
        <p>Loading enquiry details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-slate-200">

      {/* Back */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* Camp & Header */}
      <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700">
        <h1 className="text-lg font-bold">{action?.action?.camp_id?.camp_name}</h1>
      </div>

      {/* Action Info */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h2 className="font-semibold text-md flex items-center gap-2">
          <MessageCircle size={18} /> Assigned Action
        </h2>

        {/* ACTION TYPE */}
        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          {action?.action?.action === "Visit" ? (
            <MapPin className="text-green-400" size={20} />
          ) : (
            <PhoneCall className="text-blue-400" size={20} />
          )}
          <span className="text-sm font-medium">{action?.action?.action}</span>
        </div>

        {/* PRIORITY */}
        <div>
          <p className="text-xs text-slate-400">Priority</p>
          <p className="text-sm font-semibold">{action?.action?.priority} / 10</p>
        </div>

        {/* NEXT ACTION DATE */}
        <div>
          <p className="text-xs text-slate-400">Next Action Date</p>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-yellow-400" />
            {new Date(action?.action?.next_step_date).toLocaleDateString()}
          </div>
        </div>

        {/* FEEDBACK */}
        <div>
          <p className="text-xs text-slate-400 mb-1">Previous Feedback</p>
          <div className="bg-slate-800/70 border border-slate-700 p-3 rounded-lg text-sm">
            {action?.action?.feedback || "No feedback given."}
          </div>
        </div>
      </div>

      {/* FORWARD BUTTON */}
      <Button
        className="flex items-center gap-1"
        onClick={() =>
          router.push(`/staff/enquiry/${params.enquiry_id}/forward-enquiry`)
        }
      >
        Forward Enquiry
      </Button>
    </div>
  );
}
