"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Cookies from "js-cookie";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DatePicker, Space } from "antd";
import { ChevronDown, ChevronUp, PanelsTopLeft, Search, SlidersHorizontal } from "lucide-react";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { useGetAccessEnquiriesForStaffs, useGetEqAreas, useGetEqCampsByArea, useGetEqCities, useGetEqCountries, useGetEqProvince, useGetEqRegions } from "@/query/enquirymanager/queries";
import EnquiryUserFilterField from "@/components/enquiries/EnquiryUserFilterField";
import { Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { RootState } from "@/redux/store";
import { loadStaffEnquiriesListState } from "@/redux/slices/application";

const { RangePicker } = DatePicker;

const NEXT_ACTION_OPTIONS = [
  { _id: "all", name: "All" },
  { _id: "Call", name: "Call" },
  { _id: "Visit", name: "Visit" },
];

const STATUS_OPTIONS = [
  { _id: "all", name: "All" },
  { _id: "Lead Received", name: "Lead Received" },
  { _id: "Initial Meeting Over", name: "Initial Meeting Over" },
  { _id: "Survey Completed", name: "Survey Completed" },
  { _id: "Proposal Submitted", name: "Proposal Submitted" },
  { _id: "Waiting For Client Response", name: "Waiting For Client Response" },
  { _id: "On Hold", name: "On Hold" },
  { _id: "Project Awarded", name: "Project Awarded" },
];

const PRIORITY_OPTIONS = [
  { _id: "1", name: "1 - <500" },
  { _id: "2", name: "2 - 500-1,000" },
  { _id: "3", name: "3 - 1,000-2,000" },
  { _id: "4", name: "4 - 2,000-3,000" },
  { _id: "5", name: "5 - 3,000-5,000" },
  { _id: "6", name: "6 - 5,000-10,000" },
  { _id: "7", name: "7 - 10,000-20,000" },
  { _id: "8", name: "8 - 20,000-35,000" },
  { _id: "9", name: "9 - 35,000-50,000" },
  { _id: "10", name: "10 - 50,000+" },
];

/* -------------------------------------------------------
                      PAGE START
---------------------------------------------------------*/

export default function EnquiriesPage() {
  const router = useRouter();
  const { data: session }: any = useSession();
  const dispatch = useDispatch();
  const savedListState = useSelector((state: RootState) => state.application.staffEnquiriesListState);
  const initialFilters = useMemo(() => ({
    country_id: "",
    region_id: "",
    province_id: "",
    city_id: "",
    area_id: "",
    camp_id: "",
    status: "all",
    next_action: "all",
    occupancy: "",
    capacity: "",
    wifi_available: "",
    competition: "",
    priority: "",
    from_date: "",
    due_date: "",
    lease_expiry: "",
    enquiry_uuid: "",
    search: "",
    enquiry_brought_by: "",
    created_by: "",
  }), []);
  const restoredFilters = useMemo(
    () => ({ ...initialFilters, ...(savedListState?.filters ?? {}) }),
    [initialFilters, savedListState?.filters]
  );
  const [showFilters, setShowFilters] = useState(Boolean(savedListState?.showFilters));
  const [activeListFilter, setActiveListFilter] = useState(savedListState?.activeListFilter ?? "all");
  const [page, setPage] = useState<number>(savedListState?.page || 1);
  const [businessId, setBusinessId] = useState("");
  const [enquiryBroughtByName, setEnquiryBroughtByName] = useState(savedListState?.enquiryBroughtByName ?? "");
  const [createdByName, setCreatedByName] = useState(savedListState?.createdByName ?? "");
  const [rangeValue, setRangeValue] = useState<any>(
    restoredFilters.from_date || restoredFilters.due_date
      ? [
        restoredFilters.from_date ? dayjs(restoredFilters.from_date) : null,
        restoredFilters.due_date ? dayjs(restoredFilters.due_date) : null,
      ]
      : null
  );
  const [leaseValue, setLeaseValue] = useState<any>(
    restoredFilters.lease_expiry ? dayjs(restoredFilters.lease_expiry) : null
  );
  const limit = 10;
  const countryInitialized = useRef(false);
  const regionInitialized = useRef(false);
  const provinceInitialized = useRef(false);
  const cityInitialized = useRef(false);
  const areaInitialized = useRef(false);

  // Filters (linked to API keys)
  const [filters, setFilters] = useState(restoredFilters);
  type FilterState = typeof restoredFilters;

  const normalizedFilters = useMemo(() => ({
    ...filters,
    status: filters.status === "all" ? "" : filters.status,
    next_action: filters.next_action === "all" ? "" : filters.next_action,
  }), [filters]);
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if ((key === "status" || key === "next_action") && value === "all") return false;
      return value !== "" && value !== null && value !== undefined;
    });
  }, [filters]);

  // Cascading dropdown lists
  const [countries, setCountries] = useState([]);

  // Queries
  const { data: enquiries, isLoading } = useGetAccessEnquiriesForStaffs({
    ...normalizedFilters,
    page: page.toString(),
    limit: limit.toString(),
  });
  const { mutateAsync: GetCountries, isPending: isCompanyLoading } = useGetEqCountries();
  const { data: regions, isLoading: isRegionLoading } = useGetEqRegions(filters?.country_id);
  const { data: provinces, isLoading: isProvinceLoading } = useGetEqProvince(filters?.region_id);
  const { data: cities, isLoading: isCityLoading } = useGetEqCities(filters?.province_id);
  const { data: areas, isLoading: isAreaLoading } = useGetEqAreas(filters.city_id);
  const { data: camps, isLoading: isCampLoading } = useGetEqCampsByArea(filters?.area_id);

  const fetchCountries = useCallback(async () => {
    const res = await GetCountries();
    if (res?.status == 200) {
      setCountries(res?.countries);
    }
  }, [GetCountries]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  useEffect(() => {
    const domainCookie = Cookies.get("user_domain");
    if (!domainCookie) return;

    try {
      const parsed = JSON.parse(domainCookie);
      setBusinessId(parsed?.business_id || "");
    } catch {
      setBusinessId("");
    }
  }, []);

  useEffect(() => {
    console.log("enq: ", enquiries);
  }, [enquiries]);

  useEffect(() => {
    dispatch(loadStaffEnquiriesListState({
      filters,
      page,
      showFilters,
      activeListFilter,
      enquiryBroughtByName,
      createdByName,
    }));
  }, [dispatch, filters, page, showFilters, activeListFilter, enquiryBroughtByName, createdByName]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  /* -------------------------------------------------------
     HANDLE FILTER UPDATES (auto triggers useQuery)
  ---------------------------------------------------------*/

  const updateFilter = (key: keyof FilterState, value: string | undefined) => {
    setFilters((prev: FilterState) => ({
      ...prev,
      [key]: value === undefined ? "" : value,   // force string or ""
    }));
  };

  /* -------------------------------------------------------
     CASCADING SELECT LOGIC
  ---------------------------------------------------------*/

  // When country changes
  useEffect(() => {
    if (!countryInitialized.current) {
      countryInitialized.current = true;
      return;
    }
    // reset children
    updateFilter("region_id", "");
    updateFilter("province_id", "");
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.country_id]);

  // When region changes
  useEffect(() => {
    if (!regionInitialized.current) {
      regionInitialized.current = true;
      return;
    }

    updateFilter("province_id", "");
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.region_id]);

  // When province changes
  useEffect(() => {
    if (!provinceInitialized.current) {
      provinceInitialized.current = true;
      return;
    }
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.province_id]);

  // When city changes
  useEffect(() => {
    if (!cityInitialized.current) {
      cityInitialized.current = true;
      return;
    }
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.city_id]);

  // When area changes
  useEffect(() => {
    if (!areaInitialized.current) {
      areaInitialized.current = true;
      return;
    }
    updateFilter("camp_id", "");
  }, [filters.area_id]);

  /* -------------------------------------------------------
          DATE HANDLERS
  ---------------------------------------------------------*/

  const handleRangeChange = (dates: any, [from, to]: [string, string]) => {
    setRangeValue(dates || null);
    updateFilter("from_date", from || "");
    updateFilter("due_date", to || "");
  };

  const handleLeaseChange = (date: any, dateString: string | string[]) => {
    setLeaseValue(date || null);
    updateFilter("lease_expiry", Array.isArray(dateString) ? dateString[0] || "" : dateString || "");
  };

  const currentUserId = String(session?.user?.id || "");
  const pageEnquiries: any[] = enquiries?.data ?? enquiries?.enquiries ?? [];
  const pagination = enquiries?.pagination;

  const isCreatedByCurrentUser = (enquiry: any) => {
    if (!currentUserId) return false;
    return String(enquiry?.createdBy?._id ?? enquiry?.createdBy ?? "") === currentUserId;
  };

  const enquiryCounts = {
    all: pagination?.totalRecords ?? pageEnquiries.length,
    createdByYou: pageEnquiries.filter((e) => isCreatedByCurrentUser(e)).length,
    assignedForwarded: pageEnquiries.filter((e) => !isCreatedByCurrentUser(e)).length,
    notApprovedYet: pageEnquiries.filter((e) => !e?.is_active).length,
  };

  const visibleEnquiries = pageEnquiries.filter((e) => {
    if (activeListFilter === "createdByYou" && !isCreatedByCurrentUser(e)) return false;
    if (activeListFilter === "assignedForwarded" && isCreatedByCurrentUser(e)) return false;
    if (activeListFilter === "notApprovedYet" && e?.is_active) return false;

    return true;
  });

  const pageItems = useMemo(() => {
    const totalPages = pagination?.totalPages ?? 1;
    if (totalPages <= 1) return [];
    if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const tailSize = 5;
    const mainSize = 5;
    const tailStart = Math.max(totalPages - tailSize + 1, 1);
    let mainStart = page <= 5 ? 1 : page + 1;

    if (mainStart >= tailStart) {
      mainStart = tailStart;
    }
    let mainEnd = Math.min(mainStart + mainSize - 1, totalPages);
    if (mainEnd >= tailStart - 1) {
      mainEnd = tailStart - 1;
    }

    const items = [];
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
  }, [pagination?.totalPages, page]);

  const listFilterBadges = [
    {
      key: "all",
      label: "All Enquiries",
      count: enquiryCounts.all,
    },
    {
      key: "createdByYou",
      label: "Created By You",
      count: enquiryCounts.createdByYou,
    },
    {
      key: "assignedForwarded",
      label: "Assigned / Forwarded",
      count: enquiryCounts.assignedForwarded,
    },
    {
      key: "notApprovedYet",
      label: "Not Approved Yet",
      count: enquiryCounts.notApprovedYet,
    },
  ];

  /* -------------------------------------------------------
          UI START
  ---------------------------------------------------------*/
  return (
    <div className="p-4 pb-20">

      {/* HEADER */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4 flex justify-between items-center">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <PanelsTopLeft size={16} /> Enquiries
        </h1>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/staff/enquiry/add-enquiry")}>
            Add Enquiry
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/staff/enquiry/head-quaters")}>
            Head Offices
          </Button>
        </div>
      </div>

      {/* SEARCH + FILTER TOGGLE */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search UUID or camp name, or use status: ..., priority: ..., occupancy: ..., wifi: ..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
              className="w-full rounded-lg border border-slate-700/70 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-800/60"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <SlidersHorizontal size={16} className="mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {showFilters ? (
              <ChevronUp size={16} className="ml-2" />
            ) : (
              <ChevronDown size={16} className="ml-2" />
            )}
          </Button>
        </div>

        {showFilters && (
          <>
            <div className="mt-4 mb-2 flex items-center justify-between px-2">
              <h2 className="font-semibold text-xs text-slate-300">Filters</h2>
              <p className="text-[11px] text-slate-500">Refine results with quick criteria</p>
            </div>

            <div className="flex flex-wrap -m-1">
              {/* COUNTRY */}
              <FilterSelect
                label="Country"
                value={filters.country_id}
                options={countries}
                onChange={(v: string) => updateFilter("country_id", v)}
                disabled={false}
              />

              {/* REGION */}
              <FilterSelect
                label="Region"
                value={filters.region_id}
                options={regions?.region}
                onChange={(v: string) => updateFilter("region_id", v)}
                disabled={!filters.country_id}
              />

              {/* PROVINCE */}
              <FilterSelect
                label="Province"
                value={filters.province_id}
                options={provinces?.provinces}
                onChange={(v: string) => updateFilter("province_id", v)}
                disabled={!filters.region_id}
              />

              {/* CITY */}
              <FilterSelect
                label="City"
                value={filters.city_id}
                options={cities?.cities}
                onChange={(v: string) => updateFilter("city_id", v)}
                disabled={!filters.province_id}
              />

              {/* AREA */}
              <FilterSelect
                label="Area"
                value={filters.area_id}
                options={areas?.areas}
                onChange={(v: string) => updateFilter("area_id", v)}
                disabled={!filters.city_id}
              />

              {/* CAMP */}
              <FilterSelect
                label="Camp"
                value={filters.camp_id}
                options={camps?.camps}
                onChange={(v: string) => updateFilter("camp_id", v)}
                disabled={!filters.area_id}
              />

              <EnquiryUserFilterField
                label="Enquiry Brought By"
                businessId={businessId}
                selectedUserId={filters.enquiry_brought_by}
                selectedUserName={enquiryBroughtByName}
                onSelect={(user) => {
                  updateFilter("enquiry_brought_by", user.id);
                  setEnquiryBroughtByName(user.name);
                }}
                onClear={() => {
                  updateFilter("enquiry_brought_by", "");
                  setEnquiryBroughtByName("");
                }}
              />

              <EnquiryUserFilterField
                label="Enquiry Created By"
                businessId={businessId}
                selectedUserId={filters.created_by}
                selectedUserName={createdByName}
                onSelect={(user) => {
                  updateFilter("created_by", user.id);
                  setCreatedByName(user.name);
                }}
                onClear={() => {
                  updateFilter("created_by", "");
                  setCreatedByName("");
                }}
              />

              {/* STATUS */}
              <FilterSelect
                label="Status"
                value={filters.status}
                disabled={false}
                options={STATUS_OPTIONS}
                onChange={(v: string) => updateFilter("status", v)}
              />

              {/* NEXT ACTION */}
              <FilterSelect
                label="Next Action"
                value={filters.next_action}
                disabled={false}
                options={NEXT_ACTION_OPTIONS}
                onChange={(v: string) => updateFilter("next_action", v)}
              />

              {/* Occupancy */}
              <div className="w-full lg:w-1/4 mt-1">
                <div className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg px-2 pb-2 ${filters.occupancy ? "ring-1 ring-cyan-500/40" : ""}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Label className="text-xs text-slate-400">Minimum Occupancy</Label>
                    {filters.occupancy && (
                      <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
                        <span className="size-1.5 rounded-full bg-cyan-300" />
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={filters.occupancy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("occupancy", e.target.value)}
                    placeholder="Enter Occupancy"
                    className="w-full bg-transparent border border-slate-800 rounded p-2 text-slate-200 text-sm mt-[3px]"
                  />
                </div>
              </div>

              {/* WIFI */}
              <FilterSelect
                label="WiFi Available"
                value={filters.wifi_available}
                disabled={false}
                options={[
                  { _id: "true", name: "Yes" },
                  { _id: "false", name: "No" },
                ]}
                onChange={(v: string) => updateFilter("wifi_available", v)}
              />

              {/* Competition */}
              <FilterSelect
                label="Competition"
                value={filters.competition}
                disabled={false}
                options={[
                  { _id: "true", name: "Active" },
                  { _id: "false", name: "None" },
                ]}
                onChange={(v: string) => updateFilter("competition", v)}
              />

              {/* Camp Capacity */}
              <FilterCapacity
                label="Camp Capacity"
                value={filters.capacity}
                disabled={false}
                options={Eq_CAPACITY_OPTIONS}
                onChange={(v: string) => updateFilter("capacity", v)}
              />

              {/* Priority */}
              <FilterSelect
                label="Priority"
                value={filters.priority}
                disabled={false}
                options={PRIORITY_OPTIONS}
                onChange={(v: string) => updateFilter("priority", v)}
              />

              {/* Dates */}
              <div className="w-full lg:w-1/3 p-1">
                <div className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2 ${(filters.from_date || filters.due_date) ? "ring-1 ring-cyan-500/40" : ""}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Label className="text-xs text-slate-400">Within Period</Label>
                    {(filters.from_date || filters.due_date) && (
                      <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
                        <span className="size-1.5 rounded-full bg-cyan-300" />
                      </span>
                    )}
                  </div>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <RangePicker className="enquiry-dark-picker" value={rangeValue} onChange={handleRangeChange} style={{ width: "100%" }} />
                  </Space>
                </div>
              </div>

              {/* Lease Expiry */}
              <div className="w-full lg:w-1/4 p-1">
                <div className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2 ${filters.lease_expiry ? "ring-1 ring-cyan-500/40" : ""}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Label className="text-xs text-slate-400">Lease Expiry</Label>
                    {filters.lease_expiry && (
                      <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
                        <span className="size-1.5 rounded-full bg-cyan-300" />
                      </span>
                    )}
                  </div>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <DatePicker className="enquiry-dark-picker" value={leaseValue} onChange={handleLeaseChange} style={{ width: "100%" }} />
                  </Space>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ENQUIRY LIST */}
      <div className="bg-slate-900/50 p-4 rounded-xl shadow-sm min-h-[13vh]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
            <PanelsTopLeft size={16} /> Enquiry List
          </h1>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
              <span className="size-2 rounded-full bg-cyan-300" />
              Filter On
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-24">
            <LoaderSpin size={20} title="Loading enquiries..." />
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {listFilterBadges.map((badge) => {
            const isActive = activeListFilter === badge.key;
            return (
              <button
                key={badge.key}
                type="button"
                onClick={() => setActiveListFilter(badge.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${isActive
                  ? "border-cyan-400/40 bg-gradient-to-r from-cyan-900/40 via-slate-900 to-emerald-900/30 text-white shadow-sm"
                  : "border-slate-700/80 bg-gradient-to-r from-slate-900/80 to-slate-950/80 text-slate-300 hover:border-slate-600"
                  }`}
              >
                <span className="font-medium">{badge.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "bg-white/15 text-white" : "bg-white/10 text-slate-100"
                    }`}
                >
                  {badge.count}
                </span>
              </button>
            );
          })}
        </div>

        {!isLoading && visibleEnquiries.length === 0 && (
          <p className="text-xs text-slate-500 italic">No enquiries found.</p>
        )}

        <div className="space-y-2">
          {visibleEnquiries.map((e, index) => {
            const currentPage = pagination?.page ?? page;
            const totalRecords = pagination?.totalRecords ?? pageEnquiries.length;
            const enquiryNumber = activeListFilter === "all"
              ? Math.max(totalRecords - ((currentPage - 1) * limit + index), 0)
              : Math.max(visibleEnquiries.length - index, 0);
            return (
              <div
                key={e._id}
                className="relative p-3 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
                onClick={() => router.replace(`/staff/enquiry/${e._id}`)}
              >
                {!e?.is_active && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-950/50 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-sm">
                      Action Required
                    </span>
                  </div>
                )}
                <div className="absolute top-3 left-3 text-xs font-bold text-slate-400 p-1">
                  {String(enquiryNumber).padStart(2, "0")} )
                </div>
                <h2 className="text-md font-medium text-slate-200 truncate ml-8 uppercase">
                  Camp: {e.camp_id?.camp_name ?? "N/A"}
                </h2>
                <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-2">
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Status: <span className="text-white/80 font-normal">{e.status}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Priority: <span className="text-white/80 font-normal">{e.forwarded_priority ?? e.priority}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Occupancy: <span className="text-white/80 font-normal">{e.camp_id?.camp_occupancy ?? "N/A"}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">UUID: <span className="text-white/80 font-normal">{e.enquiry_uuid}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">WiFi: <span className="text-white/80 font-normal">{e.wifi_available ? "Yes" : "No"}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Due Date: <span className="text-white/80 font-normal">{e.due_date?.slice(0, 10)}</span></p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
          <p>
            Page {pagination.page} of {pagination.totalPages} · Total {pagination.totalRecords}
          </p>
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
                    setPage((prev) => Math.min(prev + 1, pagination.totalPages));
                  }}
                  className={page === pagination.totalPages ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      <style jsx global>{`
        .enquiry-dark-picker.ant-picker {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(71, 85, 105, 0.85);
          color: #f8fafc;
          box-shadow: none;
        }
        .enquiry-dark-picker .ant-picker-input > input {
          color: #f8fafc;
        }
        .enquiry-dark-picker .ant-picker-input > input::placeholder {
          color: #94a3b8;
        }
        .enquiry-dark-picker .ant-picker-separator,
        .enquiry-dark-picker .ant-picker-suffix,
        .enquiry-dark-picker .ant-picker-clear {
          color: #e2e8f0;
        }
        .enquiry-dark-picker .ant-picker-clear {
          background: transparent;
        }
        .enquiry-dark-picker.ant-picker-focused,
        .enquiry-dark-picker.ant-picker:hover {
          border-color: rgba(100, 116, 139, 1);
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------
     REUSABLE FILTER SELECT COMPONENT
---------------------------------------------------------*/
function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: any[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const isActive = value !== "" && value !== undefined && value !== null && value !== "all";
  return (
    <div className="w-full lg:w-1/4 p-1">
      <div
        className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""
          } ${isActive ? "ring-1 ring-cyan-500/40" : ""
          }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400 block">{label}</Label>
          {isActive && (
            <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
              <span className="size-1.5 rounded-full bg-cyan-300" />
            </span>
          )}
        </div>

        <Select
          value={value === "" ? undefined : value}
          onValueChange={(v: string) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className={`${value ? "text-slate-200" : "text-slate-400"}`}>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>

          <SelectContent>
            {options?.map((o: any) => (
              <SelectItem key={o._id} value={o._id}>
                {o.country_name ||
                  o.region_name ||
                  o.province_name ||
                  o.city_name ||
                  o.area_name ||
                  o.camp_name ||
                  o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>
    </div>
  );
}

function FilterCapacity({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const isActive = value !== "" && value !== undefined && value !== null;
  return (
    <div className="w-full lg:w-1/4 p-1">
      <div
        className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""
          } ${isActive ? "ring-1 ring-cyan-500/40" : ""
          }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400 block">{label}</Label>
          {isActive && (
            <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1">
              <span className="size-1.5 rounded-full bg-cyan-300" />
            </span>
          )}
        </div>

        <Select
          value={value === "" ? undefined : value}
          onValueChange={(v: string) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className={`${value ? "text-slate-200" : "text-slate-400"}`}>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>

          <SelectContent>
            {options?.map((o: string, i: number) => (
              <SelectItem key={i} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
