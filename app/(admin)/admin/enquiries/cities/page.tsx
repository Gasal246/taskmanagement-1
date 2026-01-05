"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useGetEqCountries, useGetEqRegions, useGetEqProvince, useGetEqCitiesFiltered } from "@/query/enquirymanager/queries";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function CitiesListPage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = useState("");
    const [region_id, setRegion] = useState("");
    const [province_id, setProvince] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 15;

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities, isLoading } = useGetEqCitiesFiltered({ country_id, region_id, province_id, search, page, limit });
    const pagination = cities?.pagination;

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
    }

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [country_id, region_id, province_id, search]);

    return (
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Cities</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-200">Cities</h1>
                    <Link href="/admin/enquiries/cities/add-city">
                        <Button className="bg-cyan-700 hover:bg-cyan-600">Add New City</Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search cities, provinces, regions, or countries..."
                            className="bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                        />
                    </div>
                    <Select value={country_id} onValueChange={(v) => { setCountry(v); setRegion(""); setProvince(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                            {countries?.map((c: any) => (
                                <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select disabled={!country_id} value={region_id} onValueChange={(v) => { setRegion(v); setProvince(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Region" /></SelectTrigger>
                        <SelectContent>
                            {regions?.region?.map((r: any) => (
                                <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select disabled={!region_id} value={province_id} onValueChange={setProvince}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Province" /></SelectTrigger>
                        <SelectContent>
                            {provinces?.provinces?.map((p: any) => (
                                <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
                    <table className="w-full text-sm text-slate-300">
                        <thead className="bg-slate-800/50 text-slate-200">
                            <tr>
                                <th className="p-3 text-left">Country</th>
                                <th className="p-3 text-left">Region</th>
                                <th className="p-3 text-left">Province</th>
                                <th className="p-3 text-left">City Name</th>
                                <th className="p-3 text-left">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Loading...</td></tr>
                            ) : cities?.cities?.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">No cities found.</td></tr>
                            ) : (
                                cities?.cities?.map((city: any) => (
                                    <tr
                                        key={city._id}
                                        onClick={() => router.push(`/admin/enquiries/cities/${city._id}`)}
                                        className="border-b border-slate-700/50 hover:bg-slate-800/40"
                                    >
                                        <td className="p-3">{city.country_id?.country_name}</td>
                                        <td className="p-3">{city.region_id?.region_name}</td>
                                        <td className="p-3">{city.province_id?.province_name}</td>
                                        <td className="p-3">{city.city_name}</td>
                                        <td className="p-3">{city.updatedAt ? new Date(city.updatedAt).toLocaleDateString() : "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
                        <p>
                            Page {pagination.page} of {pagination.totalPages} - Total {pagination.totalRecords}
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
            </div>
        </div>
    );
}
