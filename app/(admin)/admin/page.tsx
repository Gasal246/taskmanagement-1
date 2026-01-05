"use client"
import TimeNow from '@/components/shared/TimeNow';
import { formatDateShortly } from '@/lib/utils';
import { Building2, CalendarCheck, CalendarPlus, EarthIcon, FilePlus, HandPlatter, ListTodo, PanelsTopLeft, ShieldQuestion, SquareLibrary, UserPlus, UserRound, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { getBusinessByIdFunc } from '@/query/business/functions';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { loadBusinessData } from '@/redux/slices/userdata';

const quickActions = [
  {
    label: 'Add Staff',
    description: 'Invite and onboard new team members.',
    href: '/admin/staffs/add-staff',
    icon: UserPlus,
  },
  {
    label: 'New Project',
    description: 'Start a project and define its scope.',
    href: '/admin/projects/add',
    icon: PanelsTopLeft,
  },
  {
    label: 'New Task',
    description: 'Create tasks and assign owners.',
    href: '/admin/tasks/addtask',
    icon: CalendarPlus,
  },
  {
    label: 'Add Enquiry',
    description: 'Log and route new enquiries.',
    href: '/admin/enquiries/add-enquiry',
    icon: FilePlus,
  },
];

const adminModules = [
  {
    label: 'Staffs',
    description: 'Manage staff profiles, roles, and access.',
    href: '/admin/staffs',
    icon: Users,
    links: [{ label: 'Add Staff', href: '/admin/staffs/add-staff' }],
  },
  {
    label: 'Clients',
    description: 'Track clients, contacts, and coverage.',
    href: '/admin/clients',
    icon: Building2,
  },
  // {
  //   label: 'Departments',
  //   description: 'Set up departments and capacity.',
  //   href: '/admin/departments',
  //   icon: SquareLibrary,
  // },
  {
    label: 'Regions',
    description: 'Manage regions and operational coverage.',
    href: '/admin/regions',
    icon: EarthIcon,
  },
  {
    label: 'Skills',
    description: 'Maintain the skill catalog.',
    href: '/admin/skills',
    icon: HandPlatter,
  },
  {
    label: 'Projects',
    description: 'Plan and approve project work.',
    href: '/admin/projects',
    icon: PanelsTopLeft,
    links: [{ label: 'Add Project', href: '/admin/projects/add' }],
  },
  {
    label: 'Tasks',
    description: 'Assign tasks and track progress.',
    href: '/admin/tasks',
    icon: CalendarCheck,
    links: [{ label: 'Add Task', href: '/admin/tasks/addtask' }],
  },
  {
    label: 'Enquiries',
    description: 'Handle enquiries, agents, and camps.',
    href: '/admin/enquiries',
    icon: ShieldQuestion,
    links: [
      { label: 'Agents', href: '/admin/enquiries/agents' },
      { label: 'Countries', href: '/admin/enquiries/countries' },
      { label: 'Regions', href: '/admin/enquiries/regions' },
      { label: 'Provinces', href: '/admin/enquiries/provinces' },
      { label: 'Cities', href: '/admin/enquiries/cities' },
      { label: 'Camps', href: '/admin/enquiries/camps' },
      { label: 'Areas', href: '/admin/enquiries/areas' },
      { label: 'Users', href: '/admin/enquiries/users' },
    ],
  },
  {
    label: 'Todo',
    description: 'Personal task list and follow-ups.',
    href: '/admin/todo',
    icon: ListTodo,
  },
  {
    label: 'Profile',
    description: 'Admin profile and credentials.',
    href: '/admin/profile',
    icon: UserRound,
  },
];

const AdminDashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { businessData } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (!businessData) {
      fetchBusinessData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessData]);

  const fetchBusinessData = async () => {
    const cookieValue = Cookies.get("user_domain");
    const bid = cookieValue ? JSON.parse(cookieValue)?.value : null;
    if (!bid) {
      return toast("Domain Not Found")
    }
    const res = await getBusinessByIdFunc(bid)
    if (res?.data) {
      dispatch(loadBusinessData(res?.data?.info))
    }
  }

  const businessLocation = [businessData?.business_city, businessData?.business_country].filter(Boolean).join(', ');

  return (
    <div className="p-4 pb-20 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg border border-slate-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
            <h1 className="text-lg font-semibold text-slate-200">
              Welcome back{businessData?.business_name ? `, ${businessData.business_name}` : ""}
            </h1>
            <p className="text-xs text-slate-400">
              {businessLocation || 'Organize staff, tasks, projects, and enquiries in one place.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[10px] px-2 py-1 rounded-full border border-slate-800 text-slate-400">
                Modules: {adminModules.length}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full border border-slate-800 text-slate-400">
                Quick Actions: {quickActions.length}
              </span>
              {businessData?.business_email && (
                <span className="text-[10px] px-2 py-1 rounded-full border border-slate-800 text-slate-400">
                  {businessData.business_email}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Local time</p>
            <div className="flex items-center gap-2 justify-end">
              <TimeNow />
              <span className="text-xs text-slate-400">{formatDateShortly(new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg border border-slate-800"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Quick Actions</h2>
          <p className="text-xs text-slate-500">Create new items faster</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                type="button"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(action.href)}
                className="text-left bg-gradient-to-tr from-slate-950/70 to-slate-900/70 border border-slate-800 hover:border-cyan-700/70 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 text-slate-200">
                  <Icon size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold">{action.label}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{action.description}</p>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg border border-slate-800"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Admin Modules</h2>
          <p className="text-xs text-slate-500">Based on routes in admin workspace</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.label}
                role="button"
                tabIndex={0}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(module.href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(module.href);
                  }
                }}
                className="cursor-pointer text-left bg-gradient-to-tr from-slate-950/70 to-slate-900/70 border border-slate-800 hover:border-cyan-700/60 rounded-lg p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
              >
                <div className="flex items-center gap-2 text-slate-200">
                  <Icon size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold">{module.label}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{module.description}</p>
                {module.links?.length ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {module.links.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(link.href);
                        }}
                        className="text-[10px] px-2 py-1 rounded-full border border-slate-700 text-slate-300 hover:border-cyan-600/60 hover:text-cyan-300"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

export default AdminDashboard
