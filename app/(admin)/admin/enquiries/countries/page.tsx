"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Earth, Plus, Search } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useGetEqCountriesFiltered } from "@/query/enquirymanager/queries";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function CountriesListPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 15;

    const { data: countries, isLoading } = useGetEqCountriesFiltered({ search, page, limit });
    const pagination = countries?.pagination;
    const countryList = countries?.countries ?? [];
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

    useEffect(() => {
        setPage(1);
    }, [search]);

    return (
        <div className="p-4 pb-10">
            <Breadcrumb>
                <BreadcrumbList className="text-sm flex items-center gap-1">
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()} className="pl-2">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Countries</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="w-full p-1 space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-gradient-to-r from-cyan-950/35 via-slate-900/75 to-emerald-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <Earth size={18} className="text-cyan-300" /> Countries Management
                        </h1>
                        <p className="text-xs text-slate-400">
                            Maintain country records used across enquiries and location mapping.
                        </p>
                    </div>
                    <Link href="/admin/enquiries/countries/add-country">
                        <Button className="w-full sm:w-auto bg-cyan-700 hover:bg-cyan-600 text-white rounded-e-full rounded-s-lg">
                            <Plus size={14} className="mr-1" /> Add New Country
                        </Button>
                    </Link>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-950/70 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-slate-200">Countries</h2>
                        <p className="text-xs text-slate-400">Total: {totalRecords}</p>
                    </div>

                    <div className="relative mb-3">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search countries..."
                            className="pl-9 bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                        />
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/80">
                        <table className="min-w-full text-sm text-slate-300">
                            <thead className="bg-slate-900/90">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Country Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Last Updated</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-slate-400">Loading countries...</td>
                                    </tr>
                                ) : countryList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-slate-400">No countries found.</td>
                                    </tr>
                                ) : (
                                    countryList.map((country: any, index: number) => (
                                        <tr
                                            key={country._id}
                                            className="group border-t border-slate-800/80 transition-colors hover:bg-gradient-to-r hover:from-cyan-950/20 hover:to-emerald-950/20"
                                        >
                                            <td className="px-4 py-3 text-xs text-slate-400">
                                                {((pagination?.page ?? page) - 1) * limit + index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-100">{country.country_name}</td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {country.updatedAt ? new Date(country.updatedAt).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 rounded-s-lg rounded-e-full border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 transition-all hover:border-cyan-500/70 hover:text-cyan-100 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.3),0_8px_20px_-12px_rgba(6,182,212,0.8)]"
                                                        onClick={() => router.push(`/admin/enquiries/countries/${country._id}`)}
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
