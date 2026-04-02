"use client"

import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, Contact, FolderKanban, Globe2, LandPlot, MapPin, Users2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGetUserDetails } from "@/query/business/queries";
import Cookies from "js-cookie";
import { toast } from "sonner";

type DashboardProject = {
  _id: string;
  project_name?: string;
  project_description?: string | null;
  status?: string;
  is_approved?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  type?: string;
  task_count?: number;
  completed_task_count?: number;
  progress?: number;
  client_name?: string | null;
  region_name?: string | null;
  area_name?: string | null;
  location_name?: string | null;
};

type UserData = {
  dep_name?: string;
  area_name?: string;
  region_name?: string;
  location_name?: string;
  role?: string;
  user_name?: {
    name?: string;
  };
  dashboard?: {
    pendingTasks?: number;
    completedTasks?: number;
    staffCount?: number | null;
    projectCount?: number;
    projects?: DashboardProject[];
  };
};

const isHeadRole = (role?: string) => Boolean(role?.endsWith("HEAD"));

const formatRoleLabel = (role?: string) => {
  if (!role) return "Staff";
  return role
    .toLowerCase()
    .split("_")
    .join(" ").toUpperCase();
};

const formatDepartmentType = (type?: string) => {
  if (!type) return "General";
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not scheduled";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getProjectStatus = (project: DashboardProject) => {
  if (!project?.is_approved) {
    return {
      label: "Waiting for approval",
      className: "border border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (project?.status === "completed") {
    return {
      label: "Completed",
      className: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (project?.status === "cancelled") {
    return {
      label: "Cancelled",
      className: "border border-rose-500/30 bg-rose-500/10 text-rose-200",
    };
  }

  return {
    label: "In progress",
    className: "border border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  };
};

const StaffHome = () => {
  const router = useRouter();
  const { mutateAsync: getUserData } = useGetUserDetails();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const readCookies = useCallback(async () => {
    try {
      setLoading(true);
      const cookieData = Cookies.get("user_domain");
      const userRoleCookie = Cookies.get("user_role");

      if (!cookieData) {
        toast.error("Cookies not found...");
        return;
      }

      if (!userRoleCookie) {
        toast.error("Role Cookies not found...");
        return;
      }

      const jsonData = JSON.parse(cookieData);
      const roleData = JSON.parse(userRoleCookie);

      let org_id = "";

      switch (roleData?.role_name) {
        case "REGION_HEAD":
        case "REGION_STAFF":
          org_id = jsonData?.region_id;
          break;
        case "AREA_HEAD":
        case "AREA_STAFF":
          org_id = jsonData?.area_id;
          break;
        case "LOCATION_HEAD":
        case "LOCATION_STAFF":
          org_id = jsonData?.location_id;
          break;
        case "REGION_DEP_HEAD":
        case "REGION_DEP_STAFF":
        case "AREA_DEP_HEAD":
        case "AREA_DEP_STAFF":
        case "LOCATION_DEP_HEAD":
        case "LOCATION_DEP_STAFF":
          org_id = jsonData?.department_id;
          break;
      }

      const role_id = roleData?._id;
      const res = await getUserData({ role_id, org_id });

      if (res?.status !== 200) {
        toast.error(res?.message || "Couldn't fetch user data");
        return;
      }

      setUserData(res?.data);
    } catch (err) {
      console.log("error while reading cookies: ", err);
      toast.error("error while reading cookies");
    } finally {
      setLoading(false);
    }
  }, [getUserData]);

  useEffect(() => {
    readCookies();
  }, [readCookies]);

  const dashboard = userData?.dashboard;
  const userName = userData?.user_name?.name || "Staff";
  const currentRole = formatRoleLabel(userData?.role);
  const headRole = isHeadRole(userData?.role);

  const stats = useMemo(() => {
    const cards = [
      {
        label: "Pending Tasks",
        value: dashboard?.pendingTasks ?? 0,
        description: "Assignments that still need attention.",
        icon: Clock3,
        accent: "from-amber-500/20 to-amber-500/5 text-amber-100 border-amber-500/20",
      },
      {
        label: "Completed Tasks",
        value: dashboard?.completedTasks ?? 0,
        description: "Work you have already closed out.",
        icon: CheckCircle2,
        accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-100 border-emerald-500/20",
      },
    ];

    if (headRole && dashboard?.staffCount !== null && dashboard?.staffCount !== undefined) {
      cards.push({
        label: "Your Staffs",
        value: dashboard?.staffCount ?? 0,
        description: "Team members currently under your scope.",
        icon: Users2,
        accent: "from-sky-500/20 to-sky-500/5 text-sky-100 border-sky-500/20",
      });
    }

    return cards;
  }, [dashboard?.completedTasks, dashboard?.pendingTasks, dashboard?.staffCount, headRole]);

  const quickLinks = useMemo(() => {
    const links = [
      {
        label: "Tasks",
        description: "Review pending work and recent updates.",
        href: "/staff/tasks",
        icon: Clock3,
      },
      {
        label: "Projects",
        description: "Open your project pipeline and progress.",
        href: "/staff/projects",
        icon: FolderKanban,
      },
      {
        label: "Profile",
        description: "Check your role and personal details.",
        href: "/staff/profile",
        icon: Contact,
      },
    ];

    if (headRole) {
      links.splice(2, 0, {
        label: "Staffs",
        description: "See the people working under your side.",
        href: "/staff/staffs",
        icon: Users2,
      });
    }

    return links;
  }, [headRole]);

  const infoPills = [
    { label: "Department", value: userData?.dep_name || "Not assigned", icon: BriefcaseBusiness },
    { label: "Role", value: currentRole, icon: Contact },
    { label: "Region", value: userData?.region_name || "No region", icon: Globe2 },
    { label: "Area", value: userData?.area_name || "No area", icon: LandPlot },
    { label: "Location", value: userData?.location_name || "No location", icon: MapPin },
  ].filter((item) => item.value && item.value !== "No location");

  return (
    <div className="p-4 pb-10 space-y-4">
      <div className="rounded-2xl border border-slate-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92),rgba(6,78,59,0.28))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Staff Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">Hi, {userName}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {loading
                ? "Loading your work summary..."
                : "Stay on top of your tasks, keep projects moving, and navigate your staff workspace with clarity."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-100">
                {currentRole}
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-300">
                Projects: {dashboard?.projectCount ?? 0}
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1 text-[11px] text-slate-300">
                Focus: {(dashboard?.pendingTasks ?? 0) > 0 ? "Active workload" : "On track"}
              </span>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2">
            {infoPills.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="w-full rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 backdrop-blur">
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <Icon size={14} className="text-cyan-300" />
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-100">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl border bg-gradient-to-br p-4 ${card.accent}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300/80">{card.label}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{card.value}</h2>
                  <p className="mt-2 text-xs text-slate-300">{card.description}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/85 to-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Staff Side Navigation</h2>
            <p className="text-xs text-slate-400">Jump straight into the pages you are most likely to use next.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                type="button"
                onClick={() => router.push(link.href)}
                className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-cyan-600/50 hover:bg-slate-900/80"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-cyan-200">
                    <Icon size={18} />
                  </div>
                  <ArrowRight size={16} className="text-slate-500 transition group-hover:text-cyan-300" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-100">{link.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{link.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/85 to-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Project Details</h2>
            <p className="text-xs text-slate-400">A quick view of the projects currently attached to your side of work.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/staff/projects")}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-600/50 hover:text-cyan-200"
          >
            View all projects
          </button>
        </div>

        {dashboard?.projects && dashboard.projects.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {dashboard.projects.map((project) => {
              const status = getProjectStatus(project);

              return (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => router.push(`/staff/projects/${project._id}`)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-cyan-600/50 hover:bg-slate-900/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {formatDepartmentType(project?.type)}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-100">{project?.project_name || "Untitled Project"}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {project?.project_description || "Project summary is not available yet."}
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Timeline</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {formatDate(project?.start_date)} to {formatDate(project?.end_date)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Task Progress</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {project?.completed_task_count ?? 0}/{project?.task_count ?? 0} tasks completed
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Completion</span>
                      <span>{project?.progress ?? 0}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${Math.min(100, Math.max(0, project?.progress ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project?.client_name && (
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                        Client: {project.client_name}
                      </span>
                    )}
                    {project?.region_name && (
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                        Region: {project.region_name}
                      </span>
                    )}
                    {project?.area_name && (
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                        Area: {project.area_name}
                      </span>
                    )}
                    {project?.location_name && (
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                        Location: {project.location_name}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
            <p className="text-sm text-slate-300">No project details are available for this staff yet.</p>
            <p className="mt-1 text-xs text-slate-500">Once projects are assigned or created, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffHome;
