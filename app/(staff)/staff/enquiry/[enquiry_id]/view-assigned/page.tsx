"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, PhoneCall, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useGetEqLatestActionForStaff } from "@/query/enquirymanager/queries";

export default function StaffEnquiryActionPage() {
  const params = useParams<{ enquiry_id: string }>();
  const router = useRouter();

  const { data: actionData, isLoading } = useGetEqLatestActionForStaff(params.enquiry_id);
  const assignedAction = actionData?.status === 200 ? actionData?.action : null;

  if (isLoading) {
    return (
      <div className="p-6 text-slate-300">
        <p>Loading enquiry details...</p>
      </div>
    );
  }

  if (!assignedAction) {
    return (
      <div className="p-6 space-y-6 text-slate-200">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Back
        </motion.button>

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
          <h1 className="text-lg font-semibold">No Assigned Action</h1>
          <p className="mt-2 text-sm text-slate-400">
            There is no action currently assigned to you for this enquiry.
          </p>
        </div>
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
        <h1 className="text-lg font-bold">{assignedAction?.camp_id?.camp_name}</h1>
      </div>

      {/* Action Info */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h2 className="font-semibold text-md flex items-center gap-2">
          <MessageCircle size={18} /> Assigned Action
        </h2>

        {/* ACTION TYPE */}
        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          {assignedAction?.action === "Visit" ? (
            <MapPin className="text-green-400" size={20} />
          ) : (
            <PhoneCall className="text-blue-400" size={20} />
          )}
          <span className="text-sm font-medium">{assignedAction?.action}</span>
        </div>

        {/* PRIORITY */}
        <div>
          <p className="text-xs text-slate-400">Priority</p>
          <p className="text-sm font-semibold">{assignedAction?.priority} / 10</p>
        </div>

        {/* NEXT ACTION DATE */}
        <div>
          <p className="text-xs text-slate-400">Next Action Date</p>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-yellow-400" />
            {assignedAction?.next_step_date ? new Date(assignedAction.next_step_date).toLocaleDateString() : "Not scheduled"}
          </div>
        </div>

        {/* FEEDBACK */}
        <div>
          <p className="text-xs text-slate-400 mb-1">Previous Feedback</p>
          <div className="bg-slate-800/70 border border-slate-700 p-3 rounded-lg text-sm">
            {assignedAction?.feedback || "No feedback given."}
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
