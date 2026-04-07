"use client"
import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DashboardIcon } from '@radix-ui/react-icons'
import { Building2, CalendarCheck, CalendarDays, EarthIcon, HandPlatter, PanelsTopLeft, ShieldQuestion, UsersIcon } from 'lucide-react'

type AdminSidebarMode = "full" | "compact";

type AdminSidebarProps = {
    mode?: AdminSidebarMode;
    onNavigate?: () => void;
    variant?: "classic" | "modern";
};

const navItems = [
    { href: "/admin", label: "Admin Dashboard", isActive: (path: string) => path === "/admin", icon: DashboardIcon },
    { href: "/admin/staffs", label: "Manage Staffs", isActive: (path: string) => path.includes("/staffs"), icon: UsersIcon },
    { href: "/admin/clients", label: "Manage Clients", isActive: (path: string) => path.includes("/clients"), icon: Building2 },
    { href: "/admin/regions", label: "Manage Regions", isActive: (path: string) => path.includes("/regions"), icon: EarthIcon },
    { href: "/admin/skills", label: "Manage Skills", isActive: (path: string) => path.includes("/skills"), icon: HandPlatter },
    { href: "/admin/projects", label: "Manage Projects", isActive: (path: string) => path.includes("/projects"), icon: PanelsTopLeft },
    { href: "/admin/tasks", label: "Manage Tasks", isActive: (path: string) => path.includes("/tasks"), icon: CalendarCheck },
    { href: "/admin/calendar", label: "Calendar", isActive: (path: string) => path.includes("/calendar"), icon: CalendarDays },
    { href: "/admin/enquiries", label: "Enquiry Manager", isActive: (path: string) => path.includes("/enquiries"), icon: ShieldQuestion },
] as const;

const AdminSidebar = ({ mode = "full", onNavigate }: AdminSidebarProps) => {
    const pathname = usePathname();
    const isCompact = mode === "compact";

    const linkClasses = (active: boolean) =>
        [
            "w-full rounded-xl py-2 text-sm font-medium transition-colors",
            "flex items-center",
            isCompact ? "justify-center px-2" : "gap-2 px-3",
            active
                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
        ].join(" ");

    return (
        <div className="flex h-full flex-col gap-1 text-sm">
            {navItems.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        title={isCompact ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                    >
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={linkClasses(active)}
                        >
                            <Icon size={18} />
                            {!isCompact && <span>{item.label}</span>}
                        </motion.div>
                    </Link>
                );
            })}
        </div>
    )
}

export default AdminSidebar
