"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Countries</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-200">Countries</h1>
                    <Link href="/admin/enquiries/countries/add-country">
                        <Button className="bg-cyan-700 hover:bg-cyan-600">Add New Country</Button>
                    </Link>
                </div>

                <div>
                    <Input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search countries..."
                        className="bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                    />
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
                    <table className="w-full text-sm text-slate-300">
                        <thead className="bg-slate-800/50 text-slate-200">
                            <tr>
                                <th className="p-3 text-left">Country Name</th>
                                <th className="p-3 text-left">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={2} className="p-4 text-center text-slate-400">Loading...</td></tr>
                            ) : countries?.countries?.length === 0 ? (
                                <tr><td colSpan={2} className="p-4 text-center text-slate-400">No countries found.</td></tr>
                            ) : (
                                countries?.countries?.map((country: any) => (
                                    <tr
                                        key={country._id}
                                        onClick={() => router.push(`/admin/enquiries/countries/${country._id}`)}
                                        className="border-b border-slate-700/50 hover:bg-slate-800/40"
                                    >
                                        <td className="p-3">{country.country_name}</td>
                                        <td className="p-3">{country.updatedAt ? new Date(country.updatedAt).toLocaleDateString() : "-"}</td>
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
