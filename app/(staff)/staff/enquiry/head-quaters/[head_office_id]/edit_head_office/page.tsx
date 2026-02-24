"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetStaffEqHeadOfficeProfile, useUpdateStaffEqHeadOffice, useGetStaffEqCampsFiltered } from "@/query/enquirymanager/queries";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function EditHeadOfficePage() {
    const router = useRouter();
    const params = useParams<{ head_office_id: string }>();
    const { register, handleSubmit, reset } = useForm();

    const [selectedCamps, setSelectedCamps] = useState<string[]>([]);
    const [campSearch, setCampSearch] = useState("");
    const [campPage, setCampPage] = useState(1);
    const campLimit = 8;

    const { data: headOfficeData, isLoading } = useGetStaffEqHeadOfficeProfile(params.head_office_id);
    const { mutateAsync: UpdateHeadOffice, isPending: isUpdating } = useUpdateStaffEqHeadOffice();
    const { data: campsData, isLoading: isCampsLoading } = useGetStaffEqCampsFiltered({ search: campSearch, page: campPage, limit: campLimit });
    const campPagination = campsData?.pagination;

    const campPageItems = useMemo(() => {
        const totalPages = campPagination?.totalPages ?? 1;
        if (totalPages <= 1) return [];
        if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

        const tailSize = 5;
        const mainSize = 5;
        const tailStart = Math.max(totalPages - tailSize + 1, 1);
        let mainStart = campPage <= 5 ? 1 : campPage + 1;

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
    }, [campPagination?.totalPages, campPage]);

    useEffect(() => {
        setCampPage(1);
    }, [campSearch]);

    useEffect(() => {
        const headOffice = headOfficeData?.head_office;
        if (!headOffice) return;

        reset({
            phone: headOffice.phone || "",
            geo_location: headOffice.geo_location || "",
            address: headOffice.address || "",
            other_details: headOffice.other_details || "",
        });

        const attachedCamps = headOfficeData?.camps?.map((camp: any) => camp._id) || [];
        setSelectedCamps(attachedCamps);
    }, [headOfficeData, reset]);

    const toggleCamp = (campId: string) => {
        setSelectedCamps((prev) => {
            if (prev.includes(campId)) {
                return prev.filter((id) => id !== campId);
            }
            return [...prev, campId];
        });
    };

    const onSubmit = async (values: any) => {
        const payload = {
            head_office_id: params.head_office_id,
            ...values,
            camp_ids: selectedCamps,
        };

        const res = await UpdateHeadOffice(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Head Office Updated");
            return router.replace(`/staff/enquiry/head-quaters/${params.head_office_id}`);
        }
        toast.error(res?.message || "Failed to update head office");
    };

    if (isLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading head office...</div>
            </div>
        );
    }

    return (
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/staff/enquiry")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/staff/enquiry")}>Enquiry Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/staff/enquiry/head-quaters")}>Head Offices</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Head Office</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-lg font-semibold text-slate-200">Edit Head Office</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input placeholder="Phone" {...register("phone")} />
                    <Input placeholder="Geo Location" {...register("geo_location")} />
                    <Textarea placeholder="Address" {...register("address")} />
                    <Textarea placeholder="Other Details" {...register("other_details")} />

                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Attach Camps</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    <Input
                        type="search"
                        value={campSearch}
                        onChange={(e) => setCampSearch(e.target.value)}
                        placeholder="Search camps to attach..."
                        className="bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                    />

                    <div className="rounded-lg border border-slate-700 bg-slate-900/40 divide-y divide-slate-800">
                        {isCampsLoading ? (
                            <div className="p-4 text-sm text-slate-400">Loading camps...</div>
                        ) : campsData?.camps?.length === 0 ? (
                            <div className="p-4 text-sm text-slate-400">No camps found.</div>
                        ) : (
                            campsData?.camps?.map((camp: any) => (
                                <label key={camp._id} className="flex items-start gap-3 p-3 text-sm text-slate-200">
                                    <Checkbox
                                        checked={selectedCamps.includes(camp._id)}
                                        onCheckedChange={() => toggleCamp(camp._id)}
                                    />
                                    <span className="flex flex-col">
                                        <span className="font-medium">{camp.camp_name}</span>
                                        <span className="text-xs text-slate-400">
                                            {camp.area_id?.area_name || "No area"}
                                        </span>
                                    </span>
                                </label>
                            ))
                        )}
                    </div>

                    {campPagination && campPagination.totalPages > 1 && (
                        <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
                            <p>
                                Page {campPagination.page} of {campPagination.totalPages} - Total {campPagination.totalRecords}
                            </p>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                setCampPage((prev) => Math.max(prev - 1, 1));
                                            }}
                                            className={campPage === 1 ? "pointer-events-none opacity-40" : ""}
                                        />
                                    </PaginationItem>
                                    {campPageItems.map((item, index) => (
                                        <PaginationItem key={`${item}-${index}`}>
                                            {item === "ellipsis" ? (
                                                <PaginationEllipsis />
                                            ) : (
                                                <PaginationLink
                                                    href="#"
                                                    isActive={item === campPage}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setCampPage(item);
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
                                                setCampPage((prev) => Math.min(prev + 1, campPagination.totalPages));
                                            }}
                                            className={campPage === campPagination.totalPages ? "pointer-events-none opacity-40" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}

                    <Button type="submit" disabled={isUpdating} className="bg-cyan-700 hover:bg-cyan-600">
                        {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
