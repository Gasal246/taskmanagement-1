"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { DatePicker, Space } from 'antd';
import { useRouter } from 'next/navigation';
import { CalendarPlus, CheckCircle2, Clock3, Filter, PanelsTopLeft } from 'lucide-react';
import { useGetAreasandDeptsForRegion, useGetBusinessClients, useGetBusinessRegions, useGetStaffProjects } from '@/query/business/queries';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Cookies from 'js-cookie';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const { RangePicker } = DatePicker;

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'waiting', label: 'Waiting For Approval' },
  { value: 'completed', label: 'Complete' },
];

const limit = 8;

const StaffProjects = () => {
  const router = useRouter();

  const [businessId, setBusinessId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [businessClients, setBusinessClients] = useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = useState<any[]>([]);
  const [regionAreas, setRegionAreas] = useState<any[]>([]);
  const [canAdd, setCanAdd] = useState(false);

  const [tab, setTab] = useState('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    client_id: '',
    region_id: '',
    area_id: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);

  const { mutateAsync: getRegions } = useGetBusinessRegions();
  const { mutateAsync: getBusinessClients } = useGetBusinessClients();
  const { mutateAsync: getAreasForRegion, isPending: loadingAreas } = useGetAreasandDeptsForRegion();

  useEffect(() => {
    const cookieData = Cookies.get("user_domain");
    const roleCookie = Cookies.get("user_role");

    if (cookieData) {
      try {
        const jsonData = JSON.parse(cookieData);
        setBusinessId(jsonData?.business_id || "");
        setOrgId(jsonData?.department_id || "");
        setCanAdd(String(jsonData?.type || "").toLowerCase() === "sales");
      } catch (error) {
        console.log("Invalid domain cookie", error);
      }
    }

    if (roleCookie) {
      try {
        const roleData = JSON.parse(roleCookie);
        setRoleId(roleData?._id || "");
      } catch (error) {
        console.log("Invalid role cookie", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!businessId) return;
    const fetchFilters = async () => {
      const [regionsRes, clientsRes] = await Promise.all([
        getRegions({ business_id: businessId }),
        getBusinessClients(businessId),
      ]);
      if (regionsRes?.status === 200) {
        setBusinessRegions(regionsRes?.data ?? []);
      }
      if (clientsRes?.status === 200) {
        setBusinessClients(clientsRes?.data ?? []);
      }
    };
    fetchFilters();
  }, [businessId, getRegions, getBusinessClients]);

  useEffect(() => {
    const fetchAreas = async () => {
      if (!filters.region_id) {
        setRegionAreas([]);
        return;
      }
      const res = await getAreasForRegion(filters.region_id);
      if (res?.status === 200) {
        setRegionAreas(res?.data?.areas ?? []);
      } else {
        setRegionAreas([]);
      }
    };

    fetchAreas();
  }, [filters.region_id, getAreasForRegion]);

  useEffect(() => {
    setPage(1);
  }, [tab, filters.type, filters.client_id, filters.region_id, filters.area_id, filters.startDate, filters.endDate]);

  const queryParams = useMemo(() => {
    return {
      business_id: businessId || undefined,
      role_id: roleId || undefined,
      org_id: orgId || undefined,
      tab: tab !== 'all' ? tab : undefined,
      type: filters.type || undefined,
      client_id: filters.client_id || undefined,
      region_id: filters.region_id || undefined,
      area_id: filters.area_id || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: String(page),
      limit: String(limit),
    };
  }, [businessId, roleId, orgId, tab, filters, page]);

  const { data: projectsResponse, isLoading } = useGetStaffProjects(queryParams);
  const projects = projectsResponse?.data ?? [];
  const pagination = projectsResponse?.pagination ?? { page: 1, totalPages: 1, total: 0, limit };
  const totalPages = Math.max(1, pagination.totalPages || 1);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const tailSize = 4;
    const mainSize = 5;
    const tailStart = Math.max(totalPages - tailSize + 1, 1);
    let mainStart = page <= 4 ? 1 : page + 1;

    if (mainStart >= tailStart) {
      mainStart = tailStart;
    }
    let mainEnd = Math.min(mainStart + mainSize - 1, totalPages);
    if (mainEnd >= tailStart - 1) {
      mainEnd = tailStart - 1;
    }

    const items: Array<number | "ellipsis"> = [];
    for (let i = mainStart; i <= mainEnd; i += 1) {
      items.push(i);
    }
    if (mainEnd > 0 && mainEnd < tailStart - 1) {
      items.push("ellipsis");
    }
    for (let i = tailStart; i <= totalPages; i += 1) {
      items.push(i);
    }
    return items;
  }, [totalPages, page]);

  const startIndex = pagination.total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, pagination.total);

  const handleDateChange = (_dates: any, dateStrings: [string, string]) => {
    setFilters((prev) => ({
      ...prev,
      startDate: dateStrings?.[0] ?? '',
      endDate: dateStrings?.[1] ?? ''
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      client_id: '',
      region_id: '',
      area_id: '',
      startDate: '',
      endDate: '',
    });
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (project: any) => {
    if (!project?.is_approved) {
      return {
        label: "Waiting for approval",
        className: "bg-amber-500/10 text-amber-200 border border-amber-500/30"
      };
    }
    if (project?.status === "completed") {
      return {
        label: "Completed",
        className: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30"
      };
    }
    if (project?.status === "cancelled") {
      return {
        label: "Cancelled",
        className: "bg-rose-500/10 text-rose-200 border border-rose-500/30"
      };
    }
    return {
      label: "On going",
      className: "bg-cyan-500/10 text-cyan-200 border border-cyan-500/30"
    };
  };

  const selectedRegionName = businessRegions.find((r: any) => r._id === filters.region_id)?.region_name;
  const selectedAreaName = regionAreas.find((a: any) => a._id === filters.area_id)?.area_name;
  const selectedClientName = businessClients.find((c: any) => c._id === filters.client_id)?.client_name;
  const selectedDomainLabel = DEPARTMENT_TYPES.find((d) => d.value === filters.type)?.label;

  return (
    <div className='space-y-4 pb-10 px-3'>
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-cyan-950/25 p-4 shadow-[0_12px_30px_-22px_rgba(34,211,238,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className='font-semibold text-lg text-slate-100 flex items-center gap-2'>
              <PanelsTopLeft size={18} className="text-cyan-300" /> Projects
            </h1>
            <p className='text-xs text-slate-300'>Track approvals, timelines, and ownership across your projects.</p>
          </div>
          {canAdd && (
            <Button className='flex items-center gap-2 border border-cyan-800/60 bg-cyan-950/40 text-white hover:bg-cyan-900/50 hover:text-white' onClick={() => router.push('/staff/projects/add')}>
              Add Project <CalendarPlus size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Filter size={14} className="text-cyan-300" />
            Filter Projects
          </div>
          <Button variant="ghost" className="text-xs" onClick={clearFilters}>Clear filters</Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-3">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-slate-900/70 md:h-12 md:grid-cols-4">
            {statusTabs.map((status) => (
              <TabsTrigger
                key={status.value}
                value={status.value}
                className="h-auto min-h-9 whitespace-normal px-2 py-1.5 text-center text-[11px] leading-tight md:h-9 md:min-h-0 md:whitespace-nowrap md:py-1 md:text-xs"
              >
                {status.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-3 md:hidden">
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
          >
            {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className={`mt-4 gap-3 md:grid md:grid-cols-2 lg:grid-cols-4 ${mobileFiltersOpen ? 'grid' : 'hidden'}`}>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Project Domain</p>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {DEPARTMENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Client</p>
            <Select
              value={filters.client_id || "all"}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, client_id: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {businessClients.map((client: any) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Region</p>
            <Select
              value={filters.region_id || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  region_id: value === "all" ? "" : value,
                  area_id: ""
                }))
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {businessRegions.map((region: any) => (
                  <SelectItem key={region._id} value={region._id}>
                    {region.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Area</p>
            <Select
              value={filters.area_id || "all"}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, area_id: value === "all" ? "" : value }))}
              disabled={!filters.region_id || loadingAreas}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder={filters.region_id ? "All areas" : "Select a region first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {regionAreas.map((area: any) => (
                  <SelectItem key={area._id} value={area._id}>
                    {area.area_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 lg:col-span-2">
            <p className="text-[11px] text-slate-400">Timeline</p>
            <div className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-slate-400/50">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <RangePicker
                  onChange={handleDateChange}
                  style={{ width: '100%', border: 0, backgroundColor: 'transparent' }}
                  className="admin-projects-range"
                />
              </Space>
            </div>
          </div>
        </div>

        {(filters.type || filters.client_id || filters.region_id || filters.area_id || filters.startDate || filters.endDate) && (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
            {filters.type && <span className="rounded-full border border-slate-700 px-3 py-1">Domain: {selectedDomainLabel}</span>}
            {filters.client_id && <span className="rounded-full border border-slate-700 px-3 py-1">Client: {selectedClientName}</span>}
            {filters.region_id && <span className="rounded-full border border-slate-700 px-3 py-1">Region: {selectedRegionName}</span>}
            {filters.area_id && <span className="rounded-full border border-slate-700 px-3 py-1">Area: {selectedAreaName}</span>}
            {(filters.startDate || filters.endDate) && (
              <span className="rounded-full border border-slate-700 px-3 py-1">
                Date: {filters.startDate || "-"} to {filters.endDate || "-"}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <PanelsTopLeft size={16} className="text-cyan-400" />
            Project List
          </h2>
          <div className="text-xs text-slate-400">{pagination.total || 0} projects</div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center w-full h-[18vh]">
            <LoaderSpin size={20} title="Loading projects..." />
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-slate-400">
            <Clock3 size={18} className="mb-2 text-slate-500" />
            No projects match the selected filters.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {projects?.map((proj: any) => {
            const status = getStatusBadge(proj);
            const regionName = proj?.region_id?.region_name || "-";
            const areaName = proj?.area_id?.area_name || "-";
            const clientName = proj?.client_id?.client_name || "-";
            const createdBy = proj?.creator?.name || proj?.admin_id?.name || "-";
            const typeLabel = DEPARTMENT_TYPES.find((t) => t.value === proj?.type)?.label || proj?.type || "-";
            return (
              <div
                key={proj._id}
                className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 hover:border-cyan-500/40 transition cursor-pointer"
                onClick={() => router.push(`/staff/projects/${proj._id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{proj.project_name}</h3>
                    <p className="mt-1 text-[11px] text-slate-400 truncate">{proj.project_description || "No description provided"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] ${status.className}`}>{status.label}</span>
                </div>

                <div className="mt-3 grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Client</span>
                    <p className="text-slate-200">{clientName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Domain</span>
                    <p className="text-slate-200">{typeLabel}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Region</span>
                    <p className="text-slate-200">{regionName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Area</span>
                    <p className="text-slate-200">{areaName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Priority</span>
                    <p className="text-slate-200 capitalize">{proj.priority || "normal"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Timeline</span>
                    <p className="text-slate-200">{formatDate(proj.start_date)} - {formatDate(proj.end_date)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Created by {createdBy}</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <CheckCircle2 size={12} /> {formatDate(proj.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-2 mt-6 text-xs text-slate-400">
            <p>Showing {startIndex}-{endIndex} of {pagination.total} projects</p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((prev) => Math.max(prev - 1, 1));
                    }}
                    className={page === 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {pageItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {item === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item as number);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
      <style jsx global>{`
        .admin-projects-range.ant-picker {
          background: transparent;
          border: 0;
          color: #e2e8f0;
          box-shadow: none;
        }
        .admin-projects-range .ant-picker-input > input {
          color: #e2e8f0;
        }
        .admin-projects-range .ant-picker-input > input::placeholder {
          color: #94a3b8;
        }
        .admin-projects-range .ant-picker-separator,
        .admin-projects-range .ant-picker-suffix,
        .admin-projects-range .ant-picker-clear {
          color: #cbd5f5;
        }
        .admin-projects-range .ant-picker-clear {
          background: transparent;
        }
        .admin-projects-range.ant-picker-focused {
          box-shadow: none;
        }
      `}</style>
    </div>
  )
}

export default StaffProjects
