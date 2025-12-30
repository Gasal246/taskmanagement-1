"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqProvince, useGetEqAreas, useGetEqCampsFiltered } from "@/query/enquirymanager/queries";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function CampsListPage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = React.useState("");
    const [region_id, setRegion] = React.useState("");
    const [province_id, setProvince] = React.useState("");
    const [city_id, setCity] = React.useState("");
    const [area_id, setArea] = useState("");
    const [search, setSearch] = React.useState("");
    const [page, setPage] = React.useState(1);
    const limit = 15;

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id)
    const { data: cities } = useGetEqCities(province_id);
    const {data: areas} = useGetEqAreas(city_id);

    const { data: camps, isLoading } = useGetEqCampsFiltered({ country_id, region_id, province_id, city_id, area_id, search, page, limit });
    const pagination = camps?.pagination;

    const fetchCountries = async () => {
        const res = await GetCountries();
        if (res?.status == 200) setCountries(res?.countries);
    }

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [country_id, region_id, province_id, city_id, area_id, search]);

    return (
        <div className="p-5 pb-10">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Manage Camps</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-200">Camps</h1>
                    <Link href="/admin/enquiries/camps/add-camp">
                        <Button className="bg-cyan-700 hover:bg-cyan-600">Add New Camp</Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by camp, area, city, province, region, or country..."
                            className="bg-slate-900/50 text-slate-200 border-slate-700 placeholder:text-slate-500"
                        />
                    </div>
                    <Select value={country_id} onValueChange={(v) => { setCountry(v); setRegion(""); setProvince(""); setCity(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                            {countries?.map((c:any) => <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!country_id} value={region_id} onValueChange={(v) => { setRegion(v); setProvince(""); setCity(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Region" /></SelectTrigger>
                        <SelectContent>
                            {regions?.region?.map((r:any) => <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!region_id} value={province_id} onValueChange={(v) => { setProvince(v); setCity(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Province" /></SelectTrigger>
                        <SelectContent>
                            {provinces?.provinces?.map((p:any) => <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!province_id} value={city_id} onValueChange={setCity}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="City" /></SelectTrigger>
                        <SelectContent>
                            {cities?.cities?.map((c:any) => <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!city_id} value={area_id} onValueChange={setArea}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Area" /></SelectTrigger>
                        <SelectContent>
                            {areas?.areas?.map((a:any) => <SelectItem key={a._id} value={a._id}>{a.area_name}</SelectItem>)}
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
                                <th className="p-3 text-left">City</th>
                                <th className="p-3 text-left">Area</th>
                                <th className="p-3 text-left">Camp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-4 text-center text-slate-400">Loading...</td></tr>
                            ) : camps?.camps?.length === 0 ? (
                                <tr><td colSpan={6} className="p-4 text-center text-slate-400">No camps found.</td></tr>
                            ) : (
                                camps?.camps?.map((camps:any) => (
                                    <tr key={camps._id} onClick={()=> router.replace(`/admin/enquiries/camps/${camps?._id}`)} className="border-b border-slate-700/50 hover:bg-slate-800/40">
                                        <td className="p-3">{camps.country_id?.country_name}</td>
                                        <td className="p-3">{camps.region_id?.region_name}</td>
                                        <td className="p-3">{camps.province_id?.province_name}</td>
                                        <td className="p-3">{camps.city_id?.city_name}</td>
                                        <td className="p-3">{camps.area_id?.area_name}</td>
                                        <td className="p-3">{camps?.camp_name}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
                        <p>
                            Page {pagination.page} of {pagination.totalPages} · Total {pagination.totalRecords}
                        </p>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            >
                                Previous
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === pagination.totalPages}
                                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
