"use client";
import React from "react";
import { Users, Mail, Phone, ArrowLeft, Activity, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetSingleStaffById } from "@/query/business/queries";

const formatLastLogin = (value?: string | Date | null) => {
  if (!value) return "Not logged yet";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Not logged yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const StaffIdPage = () => {
  const router = useRouter();
  const params = useParams<{ staffid: string }>();
  const searchParams = useSearchParams();

  const { data: staffData, isLoading } = useGetSingleStaffById(
    params.staffid,
    searchParams.get("role_id") || ""
  );

  const staffUser = staffData?.data?.staff_id || staffData?.data?.user_id;
  const statusLabel = staffUser?.status === 1 ? "Active" : "Blocked";
  const statusClass =
    staffUser?.status === 1
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-rose-500/40 bg-rose-500/10 text-rose-200";
  const lastLoginLabel = formatLastLogin(staffUser?.last_login);
  const skills = staffData?.skills || [];
  const taskCount = staffData?.task_count ?? 0;
  const activityCount = staffData?.activity_count ?? 0;

  return (
    <div className="p-3 sm:p-5 min-h-screen bg-gradient-to-tr from-slate-950/50 to-slate-900/50 rounded-xl">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
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

        <motion.div
          className="rounded-xl border border-slate-700/50 bg-gradient-to-tr from-slate-950/60 to-slate-900/70 p-4 sm:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="p-3 bg-slate-900/70 rounded-full border border-slate-800">
              <Users size={26} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
              <h2 className="text-lg sm:text-2xl font-semibold text-slate-100">
                {staffUser?.name || (isLoading ? "Loading..." : "Unknown Staff")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {staffData?.role || "Staff Member"}
              </p>
            </div>
            <div className="text-xs text-slate-400 space-y-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass}`}
              >
                {statusLabel}
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Last Login</p>
                <p className="text-xs text-slate-200">{lastLoginLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Email</p>
                    <p className="text-sm text-slate-200">{staffUser?.email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Phone</p>
                    <p className="text-sm text-slate-200">{staffUser?.phone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workload</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ListTodo size={16} />
                    <span className="text-[11px] uppercase tracking-[0.2em]">Tasks</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">{taskCount}</p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Activity size={16} />
                    <span className="text-[11px] uppercase tracking-[0.2em]">Activities</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">{activityCount}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-slate-700/50 bg-gradient-to-tr from-slate-950/60 to-slate-900/70 p-4 sm:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Skills</p>
              <h3 className="text-sm font-semibold text-slate-200 mt-1">
                Skills assigned to this staff member
              </h3>
            </div>
            <span className="text-xs text-slate-400">{skills.length} total</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.length === 0 && (
              <p className="text-xs text-slate-500">No skills assigned yet.</p>
            )}
            {skills.map((skill: any) => (
              <span
                key={skill?._id || skill?.skill_id?._id}
                className="rounded-full border border-slate-700/70 bg-slate-950/50 px-3 py-1 text-[11px] text-slate-200"
              >
                {skill?.skill_id?.skill_name || skill?.skill_name || "Skill"}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffIdPage;
