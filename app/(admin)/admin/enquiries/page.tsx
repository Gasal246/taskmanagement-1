"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  EarthIcon,
  HandPlatter,
  LandPlot,
  MapPinned,
  PanelsTopLeft,
  Plus,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RootState } from "@/redux/store";
import {
  useGetAgentsByBusiness,
  useGetEnquiriesWithFilters,
  useGetEqAreasFiltered,
  useGetEqCampsFiltered,
  useGetEqCitiesFiltered,
  useGetEqCountriesFiltered,
  useGetEqProvincesFiltered,
  useGetEqRegionsFiltered,
  useGetEqUsers,
} from "@/query/enquirymanager/queries";

type DashboardCard = {
  title: string;
  href: string;
  buttonLabel: string;
  icon: LucideIcon;
  count: number;
  isLoading: boolean;
};

const formatCount = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default function EnquiriesDashboardPage() {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const businessId = businessData?._id;

  const countFilterQuery = useMemo(() => ({ page: 1, limit: 1 }), []);
  const enquiryCountQuery = useMemo(() => ({ page: "1", limit: "1" }), []);

  const { data: enquiriesData, isLoading: isEnquiriesLoading } = useGetEnquiriesWithFilters(enquiryCountQuery);
  const { data: countriesData, isLoading: isCountriesLoading } = useGetEqCountriesFiltered(countFilterQuery);
  const { data: regionsData, isLoading: isRegionsLoading } = useGetEqRegionsFiltered(countFilterQuery);
  const { data: provincesData, isLoading: isProvincesLoading } = useGetEqProvincesFiltered(countFilterQuery);
  const { data: citiesData, isLoading: isCitiesLoading } = useGetEqCitiesFiltered(countFilterQuery);
  const { data: campsData, isLoading: isCampsLoading } = useGetEqCampsFiltered(countFilterQuery);
  const { data: areasData, isLoading: isAreasLoading } = useGetEqAreasFiltered(countFilterQuery);

  const { data: agentsData, isLoading: isAgentsLoading } = useGetAgentsByBusiness(businessId, "");
  const { data: usersData, isLoading: isUsersLoading } = useGetEqUsers(businessId, "users");

  const totalEnquiries = enquiriesData?.pagination?.totalRecords ?? 0;

  const cards: DashboardCard[] = [
    {
      title: "Enquiries List",
      href: "/admin/enquiries/list",
      buttonLabel: "Open",
      icon: ClipboardList,
      count: totalEnquiries,
      isLoading: isEnquiriesLoading,
    },
    {
      title: "Agents",
      href: "/admin/enquiries/agents",
      buttonLabel: "Manage",
      icon: Users,
      count: agentsData?.agents?.length ?? 0,
      isLoading: !!businessId && isAgentsLoading,
    },
    {
      title: "Countries",
      href: "/admin/enquiries/countries",
      buttonLabel: "Manage",
      icon: EarthIcon,
      count: countriesData?.pagination?.totalRecords ?? 0,
      isLoading: isCountriesLoading,
    },
    {
      title: "Regions",
      href: "/admin/enquiries/regions",
      buttonLabel: "Manage",
      icon: MapPinned,
      count: regionsData?.pagination?.totalRecords ?? 0,
      isLoading: isRegionsLoading,
    },
    {
      title: "Provinces",
      href: "/admin/enquiries/provinces",
      buttonLabel: "Manage",
      icon: LandPlot,
      count: provincesData?.pagination?.totalRecords ?? 0,
      isLoading: isProvincesLoading,
    },
    {
      title: "Cities",
      href: "/admin/enquiries/cities",
      buttonLabel: "Manage",
      icon: Building2,
      count: citiesData?.pagination?.totalRecords ?? 0,
      isLoading: isCitiesLoading,
    },
    {
      title: "Camps",
      href: "/admin/enquiries/camps",
      buttonLabel: "Manage",
      icon: MapPinned,
      count: campsData?.pagination?.totalRecords ?? 0,
      isLoading: isCampsLoading,
    },
    {
      title: "Areas",
      href: "/admin/enquiries/areas",
      buttonLabel: "Manage",
      icon: MapPinned,
      count: areasData?.pagination?.totalRecords ?? 0,
      isLoading: isAreasLoading,
    },
    {
      title: "Users",
      href: "/admin/enquiries/users",
      buttonLabel: "Manage",
      icon: Users2,
      count: usersData?.users?.length ?? 0,
      isLoading: !!businessId && isUsersLoading,
    },
    {
      title: "Add Enquiry",
      href: "/admin/enquiries/add-enquiry",
      buttonLabel: "Add",
      icon: Plus,
      count: totalEnquiries,
      isLoading: isEnquiriesLoading,
    },
  ];

  return (
    <div className="p-4 pb-20">
      <div className="mb-4 rounded-lg bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3">
        <h1 className="flex items-center gap-1 text-sm font-semibold text-slate-300">
          <PanelsTopLeft size={16} /> Dashboard
        </h1>
      </div>

      <section className="rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-950/55 to-slate-900/55 p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Quick Access</h2>
          <p className="text-xs text-slate-400">Quick access with live totals</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group flex min-h-[176px] flex-col justify-between rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950/70 p-4 transition-colors hover:border-slate-700"
              >
                <div>
                  <div className="mb-5 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-200">{card.title}</p>
                    <div className="rounded-lg border border-slate-700/90 bg-slate-900/70 p-2 text-slate-300">
                      <Icon size={16} />
                    </div>
                  </div>

                  <p className="text-3xl font-bold leading-none text-slate-100">
                    {card.isLoading ? "..." : formatCount(card.count)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full justify-between rounded-s-lg rounded-e-full border-slate-700 bg-slate-900/70 px-3 text-xs text-slate-100 transition-all duration-200 hover:bg-slate-800/70 group-hover:border-cyan-500/70 group-hover:text-cyan-100 group-hover:shadow-[0_0_0_1px_rgba(6,182,212,0.35),0_8px_20px_-10px_rgba(6,182,212,0.7)]"
                  onClick={() => router.push(card.href)}
                >
                  <span>{card.buttonLabel}</span>
                  <ChevronRight size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
