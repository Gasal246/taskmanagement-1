"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker, Space } from "antd";
import { ChevronDown, ChevronLeft, ChevronUp, Download, LayoutDashboardIcon, PanelsTopLeft, Plus, Search, SlidersHorizontal } from "lucide-react";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { toast } from "sonner";
import EnquiryUserFilterField from "@/components/enquiries/EnquiryUserFilterField";
import { GetEnquiriesWithFilters } from "@/query/enquirymanager/function";
import { useExportEnquiries, useGetEnquiriesWithFilters, useGetEqAreas, useGetEqCampsByArea, useGetEqCities, useGetEqCountries, useGetEqProvince, useGetEqRegions } from "@/query/enquirymanager/queries";
import { Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { loadAdminEnquiriesListState, loadEnquiriesListPage } from "@/redux/slices/application";

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

const EXPORT_HEADERS = [
  "ENQUIRY ID",
  "CITY",
  "AREA",
  "CAMP NAME",
  "CAMP OCCUPANCY",
  "LOCATION COORDINATES",
  "CONTACT INFORMATION",
  "HEAD OFFICE DETAILS",
  "WIFI STATUS",
  "CURRENT STATUS",
  "PRIORITY",
  "NEXT ACTION",
  "COMMENTS",
];

const EXPORT_COL_WIDTHS = [
  { wch: 18 },
  { wch: 16 },
  { wch: 16 },
  { wch: 24 },
  { wch: 18 },
  { wch: 22 },
  { wch: 40 },
  { wch: 40 },
  { wch: 16 },
  { wch: 16 },
  { wch: 10 },
  { wch: 22 },
  { wch: 28 },
];

/* -------------------------------------------------------
                      PAGE START
---------------------------------------------------------*/

export default function EnquiriesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const savedPage = useSelector((state: RootState) => state.application.enquiriesListPage);
  const savedListState = useSelector((state: RootState) => state.application.adminEnquiriesListState);
  const { businessData } = useSelector((state: RootState) => state.user);

  // Filters (linked to API keys)
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
  const [filters, setFilters] = useState(restoredFilters);
  const [enquiryBroughtByName, setEnquiryBroughtByName] = useState(savedListState?.enquiryBroughtByName ?? "");
  const [createdByName, setCreatedByName] = useState(savedListState?.createdByName ?? "");

  // Cascading dropdown lists
  const [countries, setCountries] = useState([]);
  const [page, setPage] = useState<number>(savedListState?.page || savedPage || 1);
  const [showFilters, setShowFilters] = useState(Boolean(savedListState?.showFilters));
  const [activeListFilter, setActiveListFilter] = useState<"all" | "waitingApproval">(savedListState?.activeListFilter === "waitingApproval" ? "waitingApproval" : "all");
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
  const [exportOpen, setExportOpen] = useState(false);
  const [filteredExportOpen, setFilteredExportOpen] = useState(false);
  const [exportSearch, setExportSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportScope, setExportScope] = useState<"selected" | "filtered" | null>(null);
  const limit = 10;
  const countryInitialized = useRef(false);
  const regionInitialized = useRef(false);
  const provinceInitialized = useRef(false);
  const cityInitialized = useRef(false);
  const areaInitialized = useRef(false);

  const normalizedFilters = useMemo(() => ({
    ...filters,
    status: filters.status === "all" ? "" : filters.status,
    next_action: filters.next_action === "all" ? "" : filters.next_action,
  }), [filters]);

  // Queries
  const { data: enquiries, isLoading } = useGetEnquiriesWithFilters({ ...normalizedFilters, page: page.toString(), limit: limit.toString() });
  const { mutateAsync: exportEnquiries, isPending: isExporting } = useExportEnquiries();
  const { mutateAsync: GetCountries, isPending: isCompanyLoading } = useGetEqCountries();
  const { data: regions, isLoading: isRegionLoading } = useGetEqRegions(filters?.country_id);
  const { data: provinces, isLoading: isProvinceLoading } = useGetEqProvince(filters?.region_id);
  const { data: cities, isLoading: isCityLoading } = useGetEqCities(filters?.province_id);
  const { data: areas, isLoading: isAreaLoading } = useGetEqAreas(filters.city_id);
  const { data: camps, isLoading: isCampLoading } = useGetEqCampsByArea(filters?.area_id);

  const exportSearchValue = exportSearch.trim();
  const { data: exportResults, isLoading: isExportSearchLoading } = useQuery({
    queryKey: ["enquiries-export-search", exportSearchValue],
    queryFn: () => GetEnquiriesWithFilters({ search: exportSearchValue, page: "1", limit: "20" }),
    enabled: exportOpen && exportSearchValue.length > 0,
  });

  const pagination = enquiries?.pagination;
  const filteredCount = pagination?.totalRecords ?? 0;

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if ((key === "status" || key === "next_action") && value === "all") return false;
      return value !== "" && value !== null && value !== undefined;
    });
  }, [filters]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const exportList = exportSearchValue ? exportResults?.data : enquiries?.data;
  const exportListLoading = exportSearchValue ? isExportSearchLoading : isLoading;

  const fetchCountries = async () => {
    const res = await GetCountries();
    console.log("countries: ", res);

    if (res?.status == 200) {
      setCountries(res?.countries);
    }
  }

  useEffect(() => {
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(loadEnquiriesListPage(page));
  }, [dispatch, page]);

  useEffect(() => {
    dispatch(loadAdminEnquiriesListState({
      filters,
      page,
      showFilters,
      activeListFilter,
      enquiryBroughtByName,
      createdByName,
    }));
  }, [dispatch, filters, page, showFilters, activeListFilter, enquiryBroughtByName, createdByName]);

  useEffect(() => {
    if (!exportOpen) {
      setExportSearch("");
      setSelectedIds([]);
      setExportScope(null);
    }
  }, [exportOpen]);


  /* -------------------------------------------------------
     HANDLE FILTER UPDATES (auto triggers useQuery)
  ---------------------------------------------------------*/

  const updateFilter = (key: string, value: any) => {
    const nextValue = value === undefined ? "" : value;
    let changed = false;
    setFilters((prev: any) => {
      if (prev[key] === nextValue) {
        return prev;
      }
      changed = true;
      return {
        ...prev,
        [key]: nextValue,
      };
    });
    if (changed) {
      setPage(1);
    }
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

  const handleRangeChange = (dates: any, [from, to]: any) => {
    setRangeValue(dates || null);
    updateFilter("from_date", from || "");
    updateFilter("due_date", to || "");
  };

  const handleLeaseChange: any = (date: any, dateString: string) => {
    setLeaseValue(date || null);
    updateFilter("lease_expiry", dateString || "");
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setEnquiryBroughtByName("");
    setCreatedByName("");
    setRangeValue(null);
    setLeaseValue(null);
    setPage(1);
  };

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
  }, [pagination?.totalPages, page]);

  const enquiryListData = enquiries?.data ?? [];
  const waitingApprovalEnquiries = enquiryListData.filter((e: any) => !e?.is_active);
  const visibleEnquiries = activeListFilter === "waitingApproval" ? waitingApprovalEnquiries : enquiryListData;
  const listFilterBadges = [
    { key: "all" as const, label: "All Enquiries", count: enquiryListData.length },
    { key: "waitingApproval" as const, label: "Waiting Approval", count: waitingApprovalEnquiries.length },
  ];

  const toggleSelection = (enquiryId: string) => {
    setSelectedIds((prev) => (
      prev.includes(enquiryId) ? prev.filter((id) => id !== enquiryId) : [...prev, enquiryId]
    ));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const formatCoordinates = (latitude?: string, longitude?: string) => {
    const lat = latitude ? String(latitude).trim() : "";
    const lon = longitude ? String(longitude).trim() : "";
    if (!lat && !lon) return "N/A";
    if (lat && lon) return `${lat}, ${lon}`;
    return lat || lon;
  };

  const formatContacts = (contacts: any[]) => {
    if (!Array.isArray(contacts) || contacts.length === 0) return "N/A";
    const entries = contacts.map((contact) => {
      const parts = [
        contact?.contact_name ? `Name: ${contact.contact_name}` : null,
        contact?.contact_phone ? `Phone: ${contact.contact_phone}` : null,
        contact?.contact_email ? `Email: ${contact.contact_email}` : null,
        contact?.contact_designation ? `Designation: ${contact.contact_designation}` : null,
        contact?.contact_authorization ? `Authorization: ${contact.contact_authorization}` : null,
      ].filter(Boolean);
      if (typeof contact?.is_decision_maker === "boolean") {
        parts.push(`Decision Maker: ${contact.is_decision_maker ? "Yes" : "No"}`);
      }
      return parts.length ? parts.join(" | ") : null;
    }).filter(Boolean);
    return entries.length ? entries.join("\n") : "N/A";
  };

  const formatHeadOffice = (headOffice: any) => {
    if (!headOffice) return "N/A";
    const parts = [
      headOffice?.phone ? `Phone: ${headOffice.phone}` : null,
      headOffice?.address ? `Address: ${headOffice.address}` : null,
      headOffice?.geo_location ? `Geo: ${headOffice.geo_location}` : null,
      headOffice?.other_details ? `Other: ${headOffice.other_details}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join("\n") : "N/A";
  };

  const normalizeValue = (value: any) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return String(value);
  };

  const buildExportRows = (data: any[]) => {
    return data.map((entry) => ([
      normalizeValue(entry?.enquiry_uuid),
      normalizeValue(entry?.city_id?.city_name),
      normalizeValue(entry?.area_id?.area_name),
      normalizeValue(entry?.camp_id?.camp_name),
      normalizeValue(entry?.camp_id?.camp_occupancy),
      formatCoordinates(entry?.camp_id?.latitude, entry?.camp_id?.longitude),
      formatContacts(entry?.contacts),
      formatHeadOffice(entry?.camp_id?.headoffice_id),
      normalizeValue(entry?.wifi_type),
      normalizeValue(entry?.status),
      normalizeValue(entry?.priority),
      normalizeValue(entry?.next_action),
      normalizeValue(entry?.comments),
    ]));
  };

  const exportToExcel = async (data: any[], fileName: string) => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...buildExportRows(data)]);
    worksheet["!cols"] = EXPORT_COL_WIDTHS;
    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enquiries");
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  const buildExportFileName = (label: "selected" | "filtered") => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `enquiries_${label}_${stamp}.xlsx`;
  };

  const handleExportSelected = async () => {
    if (!selectedIds.length) {
      toast.error("Select at least one enquiry to export.");
      return;
    }

    setExportScope("selected");
    try {
      const response = await exportEnquiries({ enquiry_ids: selectedIds });
      if (response?.status !== 200) {
        toast.error(response?.message || "Failed to export enquiries.");
        return;
      }
      const exportData = response?.data ?? [];
      console.log("exportData: ", exportData);
      if (!exportData.length) {
        toast.error("No enquiries found to export.");
        return;
      }
      await exportToExcel(exportData, buildExportFileName("selected"));
      toast.success(`Exported ${exportData.length} enquiries.`);
      setExportOpen(false);
    } catch (err) {
      console.log(err);
      toast.error("Failed to export enquiries.");
    } finally {
      setExportScope(null);
    }
  };

  const handleExportFiltered = async () => {
    if (!filteredCount) {
      toast.error("No enquiries found to export.");
      return;
    }

    setExportScope("filtered");
    try {
      const response = await exportEnquiries({ filters: normalizedFilters });
      if (response?.status !== 200) {
        toast.error(response?.message || "Failed to export enquiries.");
        return;
      }
      const exportData = response?.data ?? [];
      console.log("exportData: ", exportData);
      if (!exportData.length) {
        toast.error("No enquiries found to export.");
        return;
      }
      await exportToExcel(exportData, buildExportFileName("filtered"));
      toast.success(`Exported ${exportData.length} enquiries.`);
      setFilteredExportOpen(false);
    } catch (err) {
      console.log(err);
      toast.error("Failed to export enquiries.");
    } finally {
      setExportScope(null);
    }
  };

  /* -------------------------------------------------------
          UI START
  ---------------------------------------------------------*/
  return (
    <div className="p-4 pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4 flex items-center justify-between gap-2">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <PanelsTopLeft size={16} /> Enquiries List
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline"
            className="text-xs border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800/60"
            onClick={() => router.push("/admin/enquiries")}>
            <LayoutDashboardIcon size={14} />
            Dashboard
          </Button>
          <Button
            variant="outline"
            className="text-xs border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800/60"
            onClick={() => router.push("/admin/enquiries/add-enquiry")}
          >
            <Plus size={14} /> Add Enquiry
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full rounded-lg border border-slate-700/70 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-800/60"
                >
                  <Download size={14} className="mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Export enquiries</DialogTitle>
                  <DialogDescription>
                    Search by camp name or enquiry UUID, then select one or more enquiries to export.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Search enquiries..."
                    value={exportSearch}
                    onChange={(event) => setExportSearch(event.target.value)}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>Selected: {selectedIds.length}</span>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={clearSelection}
                      disabled={!selectedIds.length}
                    >
                      Clear selection
                    </Button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto rounded-md border border-slate-800">
                    {exportListLoading && (
                      <div className="p-4 text-xs text-slate-400">Loading enquiries...</div>
                    )}
                    {!exportListLoading && (!exportList || exportList.length === 0) && (
                      <div className="p-4 text-xs text-slate-400">No enquiries found.</div>
                    )}
                    {!exportListLoading && exportList?.map((entry: any) => {
                      const entryId = String(entry?._id);
                      const isSelected = selectedIdSet.has(entryId);
                      return (
                        <div
                          key={entryId}
                          className="flex items-start gap-3 px-3 py-2 text-left text-sm hover:bg-slate-800/60 cursor-pointer"
                          onClick={() => toggleSelection(entryId)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(entryId)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <p className="text-slate-200 whitespace-normal break-words">
                              Camp: {entry?.camp_id?.camp_name ?? "N/A"}
                            </p>
                            <p className="text-xs text-slate-400 whitespace-normal break-all">
                              UUID: {entry?.enquiry_uuid ?? "N/A"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setExportOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="text-xs"
                    onClick={handleExportSelected}
                    disabled={!selectedIds.length || isExporting}
                  >
                    {exportScope === "selected" ? "Exporting..." : "Export selected"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            {showFilters && (
              <Button
                variant="ghost"
                className="text-xs text-red-400 hover:text-red-300 z-10"
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            )}
          </div>
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
                onChange={(v: any) => updateFilter("country_id", v)}
                disabled={false}
              />

              {/* REGION */}
              <FilterSelect
                label="Region"
                value={filters.region_id}
                options={regions?.region}
                onChange={(v: any) => updateFilter("region_id", v)}
                disabled={!filters.country_id}
              />

              {/* PROVINCE */}
              <FilterSelect
                label="Province"
                value={filters.province_id}
                options={provinces?.provinces}
                onChange={(v: any) => updateFilter("province_id", v)}
                disabled={!filters.region_id}
              />

              {/* CITY */}
              <FilterSelect
                label="City"
                value={filters.city_id}
                options={cities?.cities}
                onChange={(v: any) => updateFilter("city_id", v)}
                disabled={!filters.province_id}
              />

              {/* AREA */}
              <FilterSelect
                label="Area"
                value={filters.area_id}
                options={areas?.areas}
                onChange={(v: any) => updateFilter("area_id", v)}
                disabled={!filters.city_id}
              />

              {/* CAMP */}
              <FilterSelect
                label="Camp"
                value={filters.camp_id}
                options={camps?.camps}
                onChange={(v: any) => updateFilter("camp_id", v)}
                disabled={!filters.area_id}
              />

              <EnquiryUserFilterField
                label="Enquiry Brought By"
                businessId={businessData?._id || ""}
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
                businessId={businessData?._id || ""}
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
              <StatusMultiSelect
                label="Status"
                value={filters.status}
                disabled={false}
                options={STATUS_OPTIONS}
                onChange={(v: any) => updateFilter("status", v)}
              />

              {/* NEXT ACTION */}
              <FilterSelect
                label="Next Action"
                value={filters.next_action}
                disabled={false}
                options={NEXT_ACTION_OPTIONS}
                onChange={(v: any) => updateFilter("next_action", v)}
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
                    onChange={(e) => updateFilter("occupancy", e.target.value)}
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
                onChange={(v: any) => updateFilter("wifi_available", v)}
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
                onChange={(v: any) => updateFilter("competition", v)}
              />

              {/* Camp Capacity */}
              <FilterCapacity
                label="Camp Capacity"
                value={filters.capacity}
                disabled={false}
                options={Eq_CAPACITY_OPTIONS}
                onChange={(v: any) => updateFilter("capacity", v)}
              />

              {/* Priority */}
              <FilterSelect
                label="Priority"
                value={filters.priority}
                disabled={false}
                options={PRIORITY_OPTIONS}
                onChange={(v: any) => updateFilter("priority", v)}
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
            {hasActiveFilters && (
              <div className="mt-2 px-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>Export filtered: {filteredCount} result{filteredCount === 1 ? "" : "s"}</span>
                <Dialog open={filteredExportOpen} onOpenChange={setFilteredExportOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      disabled={!filteredCount || isExporting}
                    >
                      Export Filtered
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export filtered enquiries</DialogTitle>
                      <DialogDescription>
                        This will export {filteredCount} enquiry{filteredCount === 1 ? "" : "s"} matching the active filters.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setFilteredExportOpen(false)}
                        disabled={isExporting}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={handleExportFiltered}
                        disabled={!filteredCount || isExporting}
                      >
                        {exportScope === "filtered" ? "Exporting..." : "Export Filtered"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
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
          {visibleEnquiries.map((e: any, index: any) => {
            const currentPage = pagination?.page ?? page;
            const totalRecords = pagination?.totalRecords ?? 0;
            const enquiryNumber = activeListFilter === "all"
              ? Math.max(totalRecords - ((currentPage - 1) * limit + index), 0)
              : Math.max(visibleEnquiries.length - index, 0);
            return (
              <div
                key={e._id}
                className="relative p-3 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
                onClick={() => router.replace(`/admin/enquiries/${e._id}`)}
              >
                <div className="absolute top-3 left-3 text-xs font-bold text-slate-400 p-1">{String(enquiryNumber).padStart(2, '0')} )</div>
                {!e?.is_active && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                      Action Required
                    </span>
                  </div>
                )}
                <h2 className={`text-md font-medium text-slate-200 truncate ml-8 ${!e?.is_active ? "pr-32" : ""} uppercase`}>
                  Camp: {e.camp_id?.camp_name ?? "N/A"}
                </h2>
                <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-2">
                  <p className={`bg-gradient-to-br ${e.status === "Project Awarded" ? "from-green-700 to-green-900" : "from-slate-700 to-slate-900"} px-2 py-1 rounded-sm font-bold`}>Status: <span className={`text-white/80 font-normal`}>{e.status}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Priority: <span className="text-white/80 font-normal">{e.priority}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Occupancy: <span className="text-white/80 font-normal">{e.camp_id?.camp_occupancy ?? "N/A"}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">UUID: <span className="text-white/80 font-normal">{e.enquiry_uuid}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">WiFi: <span className="text-white/80 font-normal">{e.wifi_available === true ? "Yes" : e.wifi_available === false ? "No" : "Not Specified"}</span></p>
                  <p className="bg-gradient-to-br from-slate-700 to-slate-900 px-2 py-1 rounded-sm font-bold">Due Date: <span className="text-white/80 font-normal">{e.due_date?.slice(0, 10)}</span></p>
                </div>
              </div>
            );
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
                        setPage(item);
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
function FilterSelect({ label, value, options, onChange, disabled }: any) {
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
          onValueChange={(v: any) => onChange(v)}
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

function StatusMultiSelect({ label, value, options, onChange, disabled }: any) {
  const selectedValues = value && value !== "all"
    ? String(value).split(",").filter(Boolean)
    : [];
  const isActive = selectedValues.length > 0;
  const displayValue = selectedValues.length
    ? selectedValues.map((selected) => options?.find((o: any) => o._id === selected)?.name || selected).join(", ")
    : `Select ${label}`;

  const toggleValue = (status: string) => {
    const nextValues = selectedValues.includes(status)
      ? selectedValues.filter((selected) => selected !== status)
      : [...selectedValues, status];

    onChange(nextValues.length ? nextValues.join(",") : "all");
  };

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <button
              type="button"
              disabled={disabled}
              className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm ${isActive ? "text-slate-200" : "text-slate-400"}`}
            >
              <span className="line-clamp-1">{displayValue}</span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuCheckboxItem
              checked={!isActive}
              onCheckedChange={() => onChange("all")}
              onSelect={(event) => event.preventDefault()}
            >
              All
            </DropdownMenuCheckboxItem>
            {options?.filter((o: any) => o._id !== "all").map((o: any) => (
              <DropdownMenuCheckboxItem
                key={o._id}
                checked={selectedValues.includes(o._id)}
                onCheckedChange={() => toggleValue(o._id)}
                onSelect={(event) => event.preventDefault()}
              >
                {o.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FilterCapacity({ label, value, options, onChange, disabled }: any) {
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
          onValueChange={(v: any) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className={`${value ? "text-slate-200" : "text-slate-400"}`}>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>

          <SelectContent>
            {options?.map((o: any, i: number) => (
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
