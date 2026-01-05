"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useGetEqHeadOfficesFiltered } from "@/query/enquirymanager/queries";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function HeadOfficesListPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 15;

    const { data: headOffices, isLoading } = useGetEqHeadOfficesFiltered({ search, page, limit });
    const pagination = headOffices?.pagination;

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

    const formatCamps = (camps: any[]) => {
        if (!camps || camps.length === 0) return "No camps";
        return camps.map((camp) => camp.camp_name).join(", ");
    };

    return (
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/camps")}>Manage Camps</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Head Offices</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-200">Head Offices</h1>
                    <Link href="/admin/enquiries/camps/head-offices/add-head-office">
                        <Button className="bg-cyan-700 hover:bg-cyan-600">Add New Head Office</Button>
                    </Link>
                </div>

                <div>
                    <Input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by phone, address, or notes..."
                        className="bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                    />
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
                    <table className="w-full text-sm text-slate-300">
                        <thead className="bg-slate-800/50 text-slate-200">
                            <tr>
                                <th className="p-3 text-left">Phone</th>
                                <th className="p-3 text-left">Address</th>
                                <th className="p-3 text-left">Attached Camps</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-400">Loading...</td></tr>
                            ) : headOffices?.head_offices?.length === 0 ? (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-400">No head offices found.</td></tr>
                            ) : (
                                headOffices?.head_offices?.map((office: any) => (
                                    <tr
                                        key={office._id}
                                        onClick={() => router.push(`/admin/enquiries/camps/head-offices/${office._id}`)}
                                        className="border-b border-slate-700/50 hover:bg-slate-800/40"
                                    >
                                        <td className="p-3">{office.phone || "-"}</td>
                                        <td className="p-3">{office.address || "-"}</td>
                                        <td className="p-3">{formatCamps(office.camps)}</td>
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
