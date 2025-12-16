"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker, Space } from "antd";
import { PanelsTopLeft } from "lucide-react";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { useGetEnquiriesWithFilters, useGetEqAreas, useGetEqCampsByArea, useGetEqCities, useGetEqCountries, useGetEqProvince, useGetEqRegions } from "@/query/enquirymanager/queries";
import { ENQUIRY_STATUS } from "@/lib/constants";

const { RangePicker } = DatePicker;

/* -------------------------------------------------------
                      PAGE START
---------------------------------------------------------*/

export default function EnquiriesPage() {
  const router = useRouter();

  // Filters (linked to API keys)
  const [filters, setFilters] = useState({
    country_id: "",
    region_id: "",
    province_id: "",
    city_id: "",
    area_id: "",
    camp_id: "",
    status: "",
    occupancy: "",
    wifi_available: "",
    competition: "",
    priority: "",
    from_date: "",
    due_date: "",
    lease_expiry: "",
    enquiry_uuid: "",
  });

  // Cascading dropdown lists
  const [countries, setCountries] = useState([]);

  // Queries
  const { data: enquiries, isLoading } = useGetEnquiriesWithFilters(filters);
  const { mutateAsync: GetCountries, isPending: isCompanyLoading } = useGetEqCountries();
  const { data: regions, isLoading: isRegionLoading } = useGetEqRegions(filters?.country_id);
  const { data: provinces, isLoading: isProvinceLoading } = useGetEqProvince(filters?.region_id);
  const { data: cities, isLoading: isCityLoading } = useGetEqCities(filters?.province_id);
  const { data: areas, isLoading: isAreaLoading } = useGetEqAreas(filters.city_id);
  const { data: camps, isLoading: isCampLoading } = useGetEqCampsByArea(filters?.area_id);

  const fetchCountries = async () => {
    const res = await GetCountries();
    console.log("countries: ", res);

    if (res?.status == 200) {
      setCountries(res?.countries);
    }
  }

  useEffect(() => {
    fetchCountries();
  }, []);


  /* -------------------------------------------------------
     HANDLE FILTER UPDATES (auto triggers useQuery)
  ---------------------------------------------------------*/

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === undefined ? "" : value,   // force string or ""
    }));
  };

  /* -------------------------------------------------------
     CASCADING SELECT LOGIC
  ---------------------------------------------------------*/

  // When country changes
  useEffect(() => {
    // reset children
    updateFilter("region_id", "");
    updateFilter("province_id", "");
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.country_id]);

  // When region changes
  useEffect(() => {

    updateFilter("province_id", "");
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.region_id]);

  // When province changes
  useEffect(() => {
    updateFilter("city_id", "");
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.province_id]);

  // When city changes
  useEffect(() => {
    updateFilter("area_id", "");
    updateFilter("camp_id", "");
  }, [filters.city_id]);

  // When area changes
  useEffect(() => {
    updateFilter("camp_id", "");
  }, [filters.area_id]);

  /* -------------------------------------------------------
          DATE HANDLERS
  ---------------------------------------------------------*/

  const handleRangeChange = (_, [from, to]) => {
    updateFilter("from_date", from || "");
    updateFilter("due_date", to || "");
  };

  const handleLeaseChange = (_, dateString) => {
    updateFilter("lease_expiry", dateString || "");
  };

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
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/admin/enquiries/agents")}>
            Manage Agents
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/admin/enquiries/camps")}>
            Manage Camps
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/admin/enquiries/areas")}>
            Manage Areas
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/admin/enquiries/users")}>
            Manage Users
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => router.push("/admin/enquiries/add-enquiry")}>
            Add Enquiry
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-4">
        <h2 className="font-semibold text-xs text-slate-400 px-2 mb-2">Filters</h2>

        <div className="flex flex-wrap -m-1">
          {/* COUNTRY */}
          <FilterSelect
            label="Country"
            value={filters.country_id}
            options={countries}
            onChange={(v) => updateFilter("country_id", v)}
            disabled={false}
          />

          {/* REGION */}
          <FilterSelect
            label="Region"
            value={filters.region_id}
            options={regions?.region}
            onChange={(v) => updateFilter("region_id", v)}
            disabled={!filters.country_id}
          />

          {/* PROVINCE */}
          <FilterSelect
            label="Province"
            value={filters.province_id}
            options={provinces?.provinces}
            onChange={(v) => updateFilter("province_id", v)}
            disabled={!filters.region_id}
          />

          {/* CITY */}
          <FilterSelect
            label="City"
            value={filters.city_id}
            options={cities?.cities}
            onChange={(v) => updateFilter("city_id", v)}
            disabled={!filters.province_id}
          />

          {/* AREA */}
          <FilterSelect
            label="Area"
            value={filters.area_id}
            options={areas?.areas}
            onChange={(v) => updateFilter("area_id", v)}
            disabled={!filters.city_id}
          />

          {/* CAMP */}
          <FilterSelect
            label="Camp"
            value={filters.camp_id}
            options={camps?.camps}
            onChange={(v) => updateFilter("camp_id", v)}
            disabled={!filters.area_id}
          />

          {/* STATUS */}
          <FilterSelect
            label="Status"
            value={filters.status}
            disabled={false}
            options={ENQUIRY_STATUS}
            onChange={(v) => updateFilter("status", v)}
          />

          {/* Occupancy */}
          <div className="w-full lg:w-1/4 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
              <Label className="text-xs text-slate-400">Minimum Occupancy</Label>
              <input
                type="number"
                value={filters.occupancy}
                onChange={(e) => updateFilter("occupancy", e.target.value)}
                placeholder="e.g. 600"
                className="mt-1 w-full bg-transparent border rounded p-2 text-slate-200"
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
            onChange={(v) => updateFilter("wifi_available", v)}
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
            onChange={(v) => updateFilter("competition", v)}
          />

          {/* Priority */}
          <div className="w-full lg:w-1/4 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
              <Label className="text-xs text-slate-400">Priority</Label>
              <input
                value={filters.priority}
                onChange={(e) => updateFilter("priority", e.target.value)}
                placeholder="e.g. 1 - 10"
                className="mt-1 w-full bg-transparent border rounded p-2 text-slate-200"
              />
            </div>
          </div>

          {/* SEARCH BY ENQUIRY UUID */}
          <div className="w-full lg:w-1/4 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
              <Label className="text-xs text-slate-400">Enquiry UUID</Label>
              <input
                type="text"
                placeholder="Search by Enquiry UUID..."
                value={filters.enquiry_uuid}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    enquiry_uuid: e.target.value,
                  }))
                }
                className="mt-1 w-full bg-transparent border rounded p-2 text-slate-200"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="w-full lg:w-1/3 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
              <Label className="text-xs text-slate-400">Within Period</Label>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <RangePicker onChange={handleRangeChange} style={{ width: "100%" }} />
              </Space>
            </div>
          </div>

          {/* Lease Expiry */}
          <div className="w-full lg:w-1/4 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
              <Label className="text-xs text-slate-400">Lease Expiry</Label>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <DatePicker onChange={handleLeaseChange} style={{ width: "100%" }} />
              </Space>
            </div>
          </div>
        </div>
      </div>

      {/* ENQUIRY LIST */}
      <div className="bg-slate-900/50 p-4 rounded-xl shadow-sm min-h-[13vh]">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-2 mb-3">
          <PanelsTopLeft size={16} /> Enquiry List
        </h1>

        {isLoading && (
          <div className="flex justify-center items-center h-24">
            <LoaderSpin size={20} title="Loading enquiries..." />
          </div>
        )}

        {!isLoading && enquiries?.length === 0 && (
          <p className="text-xs text-slate-500 italic">No enquiries found.</p>
        )}

        <div className="space-y-2">
          {enquiries?.data?.map((e) => (
            <div
              key={e._id}
              className="p-3 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
              onClick={() => router.replace(`/admin/enquiries/${e._id}`)}
            >
              <h2 className="text-md font-medium text-slate-200 truncate">
                Camp: {e.camp_id?.camp_name ?? "N/A"}
              </h2>
              {!e?.is_active && <p className="text-sm font-medium truncate text-red-500">Action Required</p>}
              <div className="mt-1 text-xs text-slate-400">
                <p>Status: {e.status}</p>
                <p>Priority: {e.priority}</p>
                <p>Occupancy: {e.camp_id?.camp_occupancy ?? "N/A"}</p>
                <p>Competition: {e.competition_status ? "Yes" : "No"}</p>
                <p>WiFi: {e.wifi_available ? "Yes" : "No"}</p>
                <p>Due Date: {e.due_date?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
     REUSABLE FILTER SELECT COMPONENT
---------------------------------------------------------*/
function FilterSelect({ label, value, options, onChange, disabled }) {
  return (
    <div className="w-full lg:w-1/4 p-1">
      <div
        className={`bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""
          }`}
      >
        <Label className="text-xs text-slate-400 mb-1 block">{label}</Label>

        <Select
          value={value === "" ? undefined : value}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className={`${value ? "text-slate-200" : "text-slate-400"}`}>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>

          <SelectContent>
            {options?.map((o) => (
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

