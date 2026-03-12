"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    useGetEqCountries,
    useGetEqRegions,
    useGetEqCities,
    useGetEqAreas,
    useGetEqProvince,
    useGetEqCampsById,
    useUpdateEqCamp,
    useGetEqHeadOfficesFiltered
} from "@/query/enquirymanager/queries";
import { EQ_CAMP_TYPES, EQ_CAMP_VISITED_STATUS_OPTIONS, EQ_CAPACITY_LIMITS, Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Check, CircleCheckBig, Trash2 } from "lucide-react";

export default function EditCampPage() {
    const router = useRouter();
    const params = useParams<{ camp_id: string }>();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = useState("");
    const [region_id, setRegion] = useState("");
    const [province_id, setProvince] = useState("");
    const [city_id, setCity] = useState("");
    const [area_id, setArea] = useState("");
    const [head_office_id, setHeadOffice] = useState("");
    const [headOfficeOpen, setHeadOfficeOpen] = useState(false);
    const [headOfficeSearch, setHeadOfficeSearch] = useState("");
    const [headOfficeCandidate, setHeadOfficeCandidate] = useState("");
    const [selectedHeadOffice, setSelectedHeadOffice] = useState<any>(null);

    const { mutateAsync: GetCountries, isPending: isCountryLoading } = useGetEqCountries();
    const { mutateAsync: UpdateCamp, isPending: isCampUpdating } = useUpdateEqCamp();
    const { data: campData, isLoading: isCampLoading } = useGetEqCampsById(params.camp_id);
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities } = useGetEqCities(province_id);
    const { data: areas } = useGetEqAreas(city_id);
    const { data: headOffices, isLoading: isHeadOfficeLoading } = useGetEqHeadOfficesFiltered({
        search: headOfficeSearch,
        page: 1,
        limit: 200
    });

    const { register, handleSubmit, reset, control } = useForm();

    const fetchCountries = async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    };

    useEffect(() => {
        fetchCountries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (headOfficeOpen) {
            setHeadOfficeCandidate(head_office_id);
        }
    }, [headOfficeOpen, head_office_id]);

    const normalizeId = (value: any) => {
        if (!value) return "";
        return typeof value === "string" ? value : value?._id || "";
    };

    const selectedCountry = campData?.camp?.country_id;
    const selectedRegion = campData?.camp?.region_id;
    const selectedProvince = campData?.camp?.province_id;
    const selectedCity = campData?.camp?.city_id;
    const selectedArea = campData?.camp?.area_id;
    const campHeadOffice = campData?.camp?.headoffice_id;

    const countryOptions = useMemo(() => {
        const list = countries || [];
        const selectedId = normalizeId(selectedCountry);
        if (!selectedId) return list;
        const exists = list.some((c: any) => normalizeId(c) === selectedId);
        if (exists) return list;
        return [{ _id: selectedId, country_name: selectedCountry?.country_name || "Selected Country" }, ...list];
    }, [countries, selectedCountry]);

    const regionOptions = useMemo(() => {
        const list = regions?.region || [];
        const selectedId = normalizeId(selectedRegion);
        if (!selectedId) return list;
        const exists = list.some((r: any) => normalizeId(r) === selectedId);
        if (exists) return list;
        return [{ _id: selectedId, region_name: selectedRegion?.region_name || "Selected Region" }, ...list];
    }, [regions?.region, selectedRegion]);

    const provinceOptions = useMemo(() => {
        const list = provinces?.provinces || [];
        const selectedId = normalizeId(selectedProvince);
        if (!selectedId) return list;
        const exists = list.some((p: any) => normalizeId(p) === selectedId);
        if (exists) return list;
        return [{ _id: selectedId, province_name: selectedProvince?.province_name || "Selected Province" }, ...list];
    }, [provinces?.provinces, selectedProvince]);

    const cityOptions = useMemo(() => {
        const list = cities?.cities || [];
        const selectedId = normalizeId(selectedCity);
        if (!selectedId) return list;
        const exists = list.some((c: any) => normalizeId(c) === selectedId);
        if (exists) return list;
        return [{ _id: selectedId, city_name: selectedCity?.city_name || "Selected City" }, ...list];
    }, [cities?.cities, selectedCity]);

    const areaOptions = useMemo(() => {
        const list = areas?.areas || [];
        const selectedId = normalizeId(selectedArea);
        if (!selectedId) return list;
        const exists = list.some((a: any) => normalizeId(a) === selectedId);
        if (exists) return list;
        return [{ _id: selectedId, area_name: selectedArea?.area_name || "Selected Area" }, ...list];
    }, [areas?.areas, selectedArea]);

    const headOfficeList = useMemo(() => headOffices?.head_offices || [], [headOffices?.head_offices]);

    useEffect(() => {
        if (!campData?.camp) return;
        const camp = campData?.camp;
        console.log("Camp data:", camp);
        setCountry(normalizeId(camp?.country_id));
        setRegion(normalizeId(camp?.region_id));
        setProvince(normalizeId(camp?.province_id));
        setCity(normalizeId(camp?.city_id));
        setArea(normalizeId(camp?.area_id));
        setHeadOffice(normalizeId(camp?.headoffice_id));
        if (camp?.headoffice_id) {
            setSelectedHeadOffice(camp.headoffice_id);
            setHeadOfficeCandidate(normalizeId(camp.headoffice_id));
        } else {
            setSelectedHeadOffice(null);
            setHeadOfficeCandidate("");
        }

        reset({
            camp_name: camp?.camp_name || "",
            camp_type: camp?.camp_type || "",
            visited_status: camp?.visited_status || "To Visit",
            camp_capacity: camp?.camp_capacity ? String(camp?.camp_capacity) : "",
            camp_occupancy: camp?.camp_occupancy ?? "",
            latitude: camp?.latitude || "",
            longitude: camp?.longitude || "",
            landlord: camp?.landlord_id?.landlord_name || "",
            real_estate: camp?.realestate_id?.company_name || "",
            client_company: camp?.client_company_id?.client_company_name || "",
        });
    }, [campData, reset]);

    const onSubmit = async (data: any) => {
        const limit = EQ_CAPACITY_LIMITS[data.camp_capacity];
        const occupancyValue = data.camp_occupancy === "" ? undefined : Number(data.camp_occupancy);

        if (data.camp_capacity && occupancyValue !== undefined && limit && occupancyValue > limit) {
            return toast.error("Camp occupancy cannot exceed Camp Capacity");
        }

        const payload: any = {
            camp_id: params.camp_id,
            camp_name: data.camp_name,
            camp_type: data.camp_type,
            visited_status: data.visited_status,
            camp_capacity: data.camp_capacity,
            latitude: data.latitude ?? "",
            longitude: data.longitude ?? "",
            country_id,
            region_id,
            province_id,
            city_id,
            area_id,
            headoffice_id: head_office_id || null,
            landlord: data.landlord,
            real_estate: data.real_estate,
            client_company: data.client_company
        };
        if (occupancyValue !== undefined) {
            payload.camp_occupancy = occupancyValue;
        }

        const res = await UpdateCamp(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Camp updated");
            return router.replace(`/admin/enquiries/camps/${params.camp_id}`);
        }
        toast.error(res?.message || "Failed to update camp");
    };

    if (isCampLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-cyan-400" />
            </div>
        );
    }

    return (
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Manage Camps</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Camp</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-xl font-semibold text-slate-200">Edit Camp</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Camp Details</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    <Input placeholder="Camp Name" {...register("camp_name", { required: true })} />

                    <Controller
                        control={control}
                        name="camp_type"
                        defaultValue=""
                        render={({ field }) => (
                            <select
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                <option value="">Select Camp Type</option>
                                {EQ_CAMP_TYPES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        )}
                    />

                    <Controller
                        control={control}
                        name="visited_status"
                        defaultValue="To Visit"
                        render={({ field }) => (
                            <Select value={field.value ?? "To Visit"} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                    <SelectValue placeholder="Visited Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EQ_CAMP_VISITED_STATUS_OPTIONS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />

                    <Controller
                        control={control}
                        name="camp_capacity"
                        defaultValue=""
                        render={({ field }) => (
                            <select
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                <option value="">Select Camp Capacity</option>
                                {Eq_CAPACITY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        )}
                    />

                    <Input type="number" placeholder="Current Occupancy" {...register("camp_occupancy")} />
                    <Input placeholder="Latitude" {...register("latitude")} />
                    <Input placeholder="Longitude" {...register("longitude")} />

                    <select
                        value={country_id}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCountry(value);
                            setRegion("");
                            setProvince("");
                            setCity("");
                            setArea("");
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <option value="">Select Country</option>
                        {countryOptions?.map((c: any) => (
                            <option key={c._id} value={c._id}>
                                {c.country_name}
                            </option>
                        ))}
                    </select>

                    <select
                        disabled={!country_id}
                        value={region_id}
                        onChange={(e) => {
                            const value = e.target.value;
                            setRegion(value);
                            setProvince("");
                            setCity("");
                            setArea("");
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <option value="">{country_id ? "Select Region" : "Select Country first"}</option>
                        {regionOptions?.map((r: any) => (
                            <option key={r._id} value={r._id}>
                                {r.region_name}
                            </option>
                        ))}
                    </select>

                    <select
                        disabled={!region_id}
                        value={province_id}
                        onChange={(e) => {
                            const value = e.target.value;
                            setProvince(value);
                            setCity("");
                            setArea("");
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <option value="">{region_id ? "Select Province" : "Select Region first"}</option>
                        {provinceOptions?.map((p: any) => (
                            <option key={p._id} value={p._id}>
                                {p.province_name}
                            </option>
                        ))}
                    </select>

                    <select
                        disabled={!province_id}
                        value={city_id}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCity(value);
                            setArea("");
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <option value="">{province_id ? "Select City" : "Select Province first"}</option>
                        {cityOptions?.map((c: any) => (
                            <option key={c._id} value={c._id}>
                                {c.city_name}
                            </option>
                        ))}
                    </select>

                    <select
                        disabled={!city_id}
                        value={area_id}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        <option value="">{city_id ? "Select Area" : "Select City first"}</option>
                        {areaOptions?.map((a: any) => (
                            <option key={a._id} value={a._id}>
                                {a.area_name}
                            </option>
                        ))}
                    </select>

                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Head Office (Optional)</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    {selectedHeadOffice ? (
                        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 flex items-start justify-between gap-3">
                            <div className="text-sm text-slate-200">
                                <div className="font-medium">Selected Head Office</div>
                                <div className="text-xs text-slate-400">Phone: {selectedHeadOffice.phone || "N/A"}</div>
                                <div className="text-xs text-slate-400">Address: {selectedHeadOffice.address || "N/A"}</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400"
                                onClick={() => {
                                    setHeadOffice("");
                                    setSelectedHeadOffice(null);
                                    setHeadOfficeCandidate("");
                                }}
                            >
                                <Trash2 size={14} /> Remove
                            </Button>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">No head office selected.</div>
                    )}

                    {!head_office_id && (
                        <Button type="button" variant="secondary" onClick={() => setHeadOfficeOpen(true)}>
                            Select Head Office
                        </Button>
                    )}

                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Additional Information (Optional)</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    <Input placeholder="Landlord" {...register("landlord")} />
                    <Input placeholder="Real Estate Company" {...register("real_estate")} />
                    <Input placeholder="Client Company" {...register("client_company")} />

                    <Button type="submit" className="bg-cyan-700 hover:bg-cyan-600" disabled={isCampUpdating || isCountryLoading}>
                        {isCampUpdating ? "Saving..." : "Save Camp"}
                    </Button>
                </form>
            </div>

            <Dialog open={headOfficeOpen} onOpenChange={setHeadOfficeOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Select Head Office</DialogTitle>
                        <DialogDescription>Choose a head office to attach to this camp.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            placeholder="Search by phone or address"
                            value={headOfficeSearch}
                            onChange={(e) => setHeadOfficeSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 overflow-y-auto pb-16">
                        {!isHeadOfficeLoading && headOfficeList.length === 0 && (
                            <div className="w-full h-[10vh] flex items-center justify-center">
                                <h1 className="text-xs font-medium text-slate-400">
                                    {headOfficeSearch ? "No matching head offices" : "No head offices found"}
                                </h1>
                            </div>
                        )}
                        {headOfficeList.map((office: any) => (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={office._id}
                                className="p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-start mt-2 relative"
                                onClick={() => setHeadOfficeCandidate(office._id)}
                            >
                                <div className="flex flex-col">
                                    <h1 className="text-xs font-medium">Phone: {office.phone || "N/A"}</h1>
                                    <p className="text-xs text-slate-400">Address: {office.address || "N/A"}</p>
                                </div>
                                {office._id === headOfficeCandidate && (
                                    <div className="absolute top-1 right-2">
                                        <Check className="text-cyan-600" strokeWidth={3} size={18} />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    <DialogFooter className="w-full">
                        <div className="pt-2 bg-slate-950/80 w-full">
                            <motion.div
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.02 }}
                                className="p-2 bg-gradient-to-br group from-slate-950/70 to-slate-800/70 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-center"
                                onClick={() => {
                                    if (!headOfficeCandidate) return;
                                    const office = headOfficeList.find((item: any) => item._id === headOfficeCandidate);
                                    setSelectedHeadOffice(office || campHeadOffice || null);
                                    setHeadOffice(headOfficeCandidate);
                                    setHeadOfficeOpen(false);
                                }}
                            >
                                <CircleCheckBig className="group-hover:text-cyan-600" size={18} /> Select Head Office
                            </motion.div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
