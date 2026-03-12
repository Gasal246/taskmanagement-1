"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CampMap from "@/components/enquiries/CampMap";
import { useGetEqCountries, useGetEqRegions, useGetEqProvince, useGetEqCampsForMap } from "@/query/enquirymanager/queries";
import { EarthIcon, LandPlot, MapPinned, RotateCcw } from "lucide-react";

const STATUS_META = [
  { key: "Visited", label: "Visited", color: "bg-green-700", countKey: "visited" },
  { key: "To Visit", label: "To Visit", color: "bg-amber-500", countKey: "toVisit" },
  { key: "Cancelled", label: "Cancelled", color: "bg-blue-600", countKey: "cancelled" },
  { key: "Just Added", label: "Just Added", color: "bg-red-700", countKey: "justAdded" },
] as const;

export default function EnquiriesMapPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<any[]>([]);
  const [country_id, setCountry] = useState("");
  const [region_id, setRegion] = useState("");
  const [province_id, setProvince] = useState("");

  const { mutateAsync: GetCountries, isPending: isCountriesLoading } = useGetEqCountries();
  const { data: regions, isLoading: isRegionsLoading } = useGetEqRegions(country_id);
  const { data: provinces, isLoading: isProvincesLoading } = useGetEqProvince(region_id);

  const mapQuery = useMemo(
    () => ({
      country_id,
      region_id,
      province_id,
    }),
    [country_id, region_id, province_id]
  );

  const { data: mapData, isLoading: isMapLoading, isFetching: isMapFetching } = useGetEqCampsForMap(mapQuery, !!country_id);

  const fetchCountries = async () => {
    const res = await GetCountries();
    if (res?.status === 200) {
      setCountries(res?.countries || []);
    }
  };

  useEffect(() => {
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const camps = mapData?.camps || [];
  const summary = mapData?.summary || {
    total: 0,
    visited: 0,
    toVisit: 0,
    cancelled: 0,
    justAdded: 0,
  };

  return (
    <div className="p-4 pb-10">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center gap-1 text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")} className="pl-2">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Camp Map</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-4 space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.16),_transparent_25%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.96))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">Enquiries Geography</p>
              <h1 className="text-2xl font-semibold text-slate-50">Camp map by country, region, and province</h1>
              <p className="text-sm text-slate-300/80">
                Approved camps with saved coordinates are plotted here. Marker colors follow each camp&apos;s
                <span className="font-semibold text-slate-100"> map status</span>, including newly added camps without a saved visit state.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
              onClick={() => {
                setCountry("");
                setRegion("");
                setProvince("");
              }}
            >
              <RotateCcw size={14} className="mr-2" /> Reset Filters
            </Button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Map Filters</h2>
                  <p className="text-xs text-slate-400">Filter the visible camp pins.</p>
                </div>
                <MapPinned size={16} className="text-cyan-300" />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Country</p>
                  <Select
                    value={country_id}
                    onValueChange={(value) => {
                      setCountry(value);
                      setRegion("");
                      setProvince("");
                    }}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isCountriesLoading ? "Loading countries..." : "Select country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country: any) => (
                        <SelectItem key={country._id} value={country._id}>
                          {country.country_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Region</p>
                  <Select
                    disabled={!country_id}
                    value={region_id}
                    onValueChange={(value) => {
                      setRegion(value);
                      setProvince("");
                    }}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isRegionsLoading ? "Loading regions..." : "Select region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.region?.map((region: any) => (
                        <SelectItem key={region._id} value={region._id}>
                          {region.region_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Province</p>
                  <Select disabled={!region_id} value={province_id} onValueChange={setProvince}>
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={isProvincesLoading ? "Loading provinces..." : "Select province"} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces?.provinces?.map((province: any) => (
                        <SelectItem key={province._id} value={province._id}>
                          {province.province_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Legend</h2>
                  <p className="text-xs text-slate-400">Marker colors on the map.</p>
                </div>
                <EarthIcon size={16} className="text-cyan-300" />
              </div>

              <div className="space-y-3">
                {STATUS_META.map((status) => (
                  <div key={status.key} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${status.color}`} />
                      <span className="text-sm text-slate-200">{status.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-100">{summary[status.countKey]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Coverage</h2>
                  <p className="text-xs text-slate-400">Approved camps with valid coordinates.</p>
                </div>
                <LandPlot size={16} className="text-cyan-300" />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Visible Pins</p>
                <p className="mt-2 text-3xl font-semibold text-slate-50">{summary.total}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {country_id
                    ? `${camps.length} camps are currently plotted for the selected geography.`
                    : "Choose a country first to load map data."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CampMap camps={camps} isLoading={isMapLoading || isMapFetching} hasCountrySelection={!!country_id} />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Country</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {countries.find((country) => country._id === country_id)?.country_name || "Not selected"}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Region</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {regions?.region?.find((region: any) => region._id === region_id)?.region_name || "All regions"}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Province</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {provinces?.provinces?.find((province: any) => province._id === province_id)?.province_name || "All provinces"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
