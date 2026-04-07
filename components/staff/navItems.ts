import { AlarmClockCheck, CalendarDays, FolderGit2, Home, LandPlot, ShieldQuestionIcon, Users, type LucideIcon } from "lucide-react";

type StaffNavContext = {
  canViewEnquiry: boolean;
  isHead: boolean;
  isRegionHead: boolean;
};

export type StaffNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  show: (context: StaffNavContext) => boolean;
};

const allStaffNavItems: StaffNavItem[] = [
  {
    href: "/staff",
    label: "Home",
    icon: Home,
    isActive: (pathname) => pathname === "/staff",
    show: () => true,
  },
  {
    href: "/staff/tasks",
    label: "Tasks",
    icon: AlarmClockCheck,
    isActive: (pathname) => pathname.includes("/staff/tasks"),
    show: () => true,
  },
  {
    href: "/staff/calendar",
    label: "Calendar",
    icon: CalendarDays,
    isActive: (pathname) => pathname.includes("/staff/calendar"),
    show: () => true,
  },
  {
    href: "/staff/projects",
    label: "Projects",
    icon: FolderGit2,
    isActive: (pathname) => pathname.includes("/staff/projects"),
    show: () => true,
  },
  {
    href: "/staff/staffs",
    label: "Staffs",
    icon: Users,
    isActive: (pathname) => pathname.includes("/staff/staffs"),
    show: ({ isHead }) => isHead,
  },
  {
    href: "/staff/region",
    label: "Region",
    icon: LandPlot,
    isActive: (pathname) => pathname.includes("/staff/region"),
    show: ({ isRegionHead }) => isRegionHead,
  },
  {
    href: "/staff/enquiry",
    label: "Enquiry",
    icon: ShieldQuestionIcon,
    isActive: (pathname) => pathname.includes("/staff/enquiry"),
    show: ({ canViewEnquiry }) => canViewEnquiry,
  },
];

export const getStaffNavItems = (context: StaffNavContext) =>
  allStaffNavItems.filter((item) => item.show(context));
