"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqProvince, useGetEqAreas, useGetEqCampsFiltered } from "@/query/enquirymanager/queries";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { ArrowRight, HandPlatter, Plus, Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const CAMP_VISITED_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Visited", label: "Visited" },
  { value: "To Visit", label: "To Visit" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "just_added", label: "Just Added" },
] as const;

export default function CampsListPage() {
  const router = useRouter();
  const [countries, setCountries] = useState([]);
  const [country_id, setCountry] = React.useState("");
  const [region_id, setRegion] = React.useState("");
  const [province_id, setProvince] = React.useState("");
  const [city_id, setCity] = React.useState("");
  const [area_id, setArea] = useState("");
  const [visited_status, setVisitedStatus] = useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 15;

  const { mutateAsync: GetCountries } = useGetEqCountries();
  const { data: regions } = useGetEqRegions(country_id);
  const { data: provinces } = useGetEqProvince(region_id);
  const { data: cities } = useGetEqCities(province_id);
  const { data: areas } = useGetEqAreas(city_id);

  const { data: camps, isLoading } = useGetEqCampsFiltered({
    country_id,
    region_id,
    province_id,
    city_id,
    area_id,
    visited_status: visited_status === "all" ? "" : visited_status,
    search,
    page,
    limit
  });
  const pagination = camps?.pagination;
  const campList = camps?.camps ?? [];
  const totalRecords = pagination?.totalRecords ?? 0;

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

  const fetchCountries = async () => {
    const res = await GetCountries();
    if (res?.status == 200) setCountries(res?.countries);
  };

  useEffect(() => {
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [country_id, region_id, province_id, city_id, area_id, visited_status, search]);

  return (
    <div className="p-4 pb-10">
      <Breadcrumb>
        <BreadcrumbList className="text-sm flex items-center gap-1">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()} className="pl-2">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Manage Camps</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="w-full p-1 space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-gradient-to-r from-cyan-950/35 via-slate-900/75 to-emerald-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <HandPlatter size={18} className="text-cyan-300" /> Camps Management
            </h1>
            <p className="text-xs text-slate-400">
              Manage camps and navigate quickly to related head offices.
            </p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Link href="/admin/enquiries/camps/head-offices" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto rounded-e-full rounded-s-lg border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800/70">
                Manage Head Offices
              </Button>
            </Link>
            <Link href="/admin/enquiries/camps/add-camp" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-cyan-700 hover:bg-cyan-600 text-white rounded-e-full rounded-s-lg">
                <Plus size={14} className="mr-1" /> Add New Camp
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-950/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Camps</h2>
            <p className="text-xs text-slate-400">Total: {totalRecords}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by camp, area, city, province, region, or country..."
                className="pl-9 bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
              />
            </div>
            <Select value={country_id} onValueChange={(v) => { setCountry(v); setRegion(""); setProvince(""); setCity(""); setArea(""); }}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                {countries?.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select disabled={!country_id} value={region_id} onValueChange={(v) => { setRegion(v); setProvince(""); setCity(""); setArea(""); }}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent>
                {regions?.region?.map((r: any) => <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select disabled={!region_id} value={province_id} onValueChange={(v) => { setProvince(v); setCity(""); setArea(""); }}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="Province" /></SelectTrigger>
              <SelectContent>
                {provinces?.provinces?.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select disabled={!province_id} value={city_id} onValueChange={(v) => { setCity(v); setArea(""); }}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                {cities?.cities?.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select disabled={!city_id} value={area_id} onValueChange={setArea}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                {areas?.areas?.map((a: any) => <SelectItem key={a._id} value={a._id}>{a.area_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visited_status} onValueChange={setVisitedStatus}>
              <SelectTrigger className="bg-slate-900/50 text-slate-200 border-slate-700"><SelectValue placeholder="Visited Status" /></SelectTrigger>
              <SelectContent>
                {CAMP_VISITED_STATUS_FILTER_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80">
            <table className="min-w-full text-sm text-slate-300">
              <thead className="bg-slate-900/90">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Province</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Area</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Camp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Visited Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="p-6 text-center text-slate-400">Loading camps...</td></tr>
                ) : campList.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-slate-400">No camps found.</td></tr>
                ) : (
                  campList.map((camp: any, index: number) => (
                    <tr key={camp._id} className="group border-t border-slate-800/80 transition-colors hover:bg-gradient-to-r hover:from-cyan-950/20 hover:to-emerald-950/20">
                      <td className="px-4 py-3 text-xs text-slate-400">{((pagination?.page ?? page) - 1) * limit + index + 1}</td>
                      <td className="px-4 py-3 text-slate-300">{camp.country_id?.country_name}</td>
                      <td className="px-4 py-3 text-slate-300">{camp.region_id?.region_name}</td>
                      <td className="px-4 py-3 text-slate-300">{camp.province_id?.province_name}</td>
                      <td className="px-4 py-3 text-slate-300">{camp.city_id?.city_name}</td>
                      <td className="px-4 py-3 text-slate-300">{camp.area_id?.area_name}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{camp.camp_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            camp.visited_status === "Visited"
                              ? "bg-green-900/60 text-green-100"
                              : camp.visited_status === "Cancelled"
                                ? "bg-blue-900/60 text-blue-100"
                                : camp.visited_status === "To Visit"
                                  ? "bg-amber-700/50 text-amber-100"
                                  : "bg-red-900/60 text-red-100"
                          }`}
                        >
                          {camp.visited_status || "Just Added"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="h-8 rounded-s-lg rounded-e-full border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 transition-all hover:border-cyan-500/70 hover:text-cyan-100 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3),0_8px_20px_-12px_rgba(6,182,212,0.8)]"
                            onClick={() => router.replace(`/admin/enquiries/camps/${camp?._id}`)}
                          >
                            View <ArrowRight size={13} className="ml-1" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
            <p>Page {pagination.page} of {pagination.totalPages} · Total {pagination.totalRecords}</p>
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
      </div>
    </div>
  );
}
