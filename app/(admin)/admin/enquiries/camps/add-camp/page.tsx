"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqAreas, useGetEqProvince, useAddNewEqCamp, useGetEqHeadOfficesFiltered } from "@/query/enquirymanager/queries";
import { EQ_CAMP_TYPES, EQ_CAPACITY_LIMITS, Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Check, CircleCheckBig, Trash2 } from "lucide-react";

export default function AddCampPage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = React.useState("");
    const [region_id, setRegion] = React.useState("");
    const [province_id, setProvince] = React.useState("");
    const [city_id, setCity] = React.useState("");
    const [area_id, setArea] = React.useState("");
    const [head_office_id, setHeadOffice] = React.useState("");
    const [headOfficeOpen, setHeadOfficeOpen] = React.useState(false);
    const [headOfficeSearch, setHeadOfficeSearch] = React.useState("");
    const [headOfficeCandidate, setHeadOfficeCandidate] = React.useState("");
    const [selectedHeadOffice, setSelectedHeadOffice] = React.useState<any>(null);

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: AddNewCamp, isPending: isCampAdding } = useAddNewEqCamp();
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities } = useGetEqCities(province_id);
    const { data: areas } = useGetEqAreas(city_id);
    const { data: headOffices, isLoading: isHeadOfficeLoading } = useGetEqHeadOfficesFiltered({
        search: headOfficeSearch,
        page: 1,
        limit: 200
    });

    const fetchCountries = async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    }

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (headOfficeOpen) {
            setHeadOfficeCandidate(head_office_id);
        }
    }, [headOfficeOpen, head_office_id]);

    const { register, handleSubmit, reset, control } = useForm();

    const onSubmit = async (data: any) => {
        const limit = EQ_CAPACITY_LIMITS[data.camp_capacity];
        console.log("limit: ", limit);
        console.log("occupancy: ", data.camp_occupancy);
        
        if(data.camp_occupancy > limit){
            return toast.error("Camp occupancy cannot exceed Camp Capacity");
        }
        console.log("Submitting Camp Data:", data);
        const submitData = {
            ...data,
            country_id: country_id,
            region_id: region_id,
            province_id: province_id,
            city_id: city_id,
            area_id: area_id,
            headoffice_id: head_office_id || null
        };

        const res = await AddNewCamp(submitData);
        if (res?.status == 201) {
            toast.success(res?.message || "Camp Created");
            setHeadOffice("");
            setSelectedHeadOffice(null);
            setHeadOfficeCandidate("");
        } else {
            toast.error(res?.message || "Failed to add camp");
        }
        reset();
    };

    const headOfficeList = useMemo(() => headOffices?.head_offices || [], [headOffices?.head_offices]);

    const handleSelectHeadOffice = () => {
        if (!headOfficeCandidate) return;
        const office = headOfficeList.find((item: any) => item._id === headOfficeCandidate);
        setSelectedHeadOffice(office || null);
        setHeadOffice(headOfficeCandidate);
        setHeadOfficeOpen(false);
    };

    const handleRemoveHeadOffice = () => {
        setHeadOffice("");
        setSelectedHeadOffice(null);
        setHeadOfficeCandidate("");
    };

    return (
        <div className="p-5 pb-10">
            {/* Breadcrumb */}
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
                        <BreadcrumbPage>Add Camp</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-lg font-semibold text-slate-200">Add New Camp</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Camp Details</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>
                    <Input placeholder="Camp Name" {...register("camp_name", { required: true })} />

                    {/* Camp Type */}
                    <Controller
                        control={control}
                        name="camp_type"
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                    <SelectValue placeholder="Camp Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EQ_CAMP_TYPES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />

                    {/* Capacity */}
                    <Controller
                        control={control}
                        name="camp_capacity"
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                    <SelectValue placeholder="Camp Capacity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Eq_CAPACITY_OPTIONS.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />

                    <Input type="number" placeholder="Current Occupancy" {...register("camp_occupancy")} />



                    {/* Location Selects */}
                    <Select value={country_id} onValueChange={(v) => { setCountry(v); setRegion(""); setProvince(""); setCity(""); setArea(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                            {countries?.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!country_id} value={region_id} onValueChange={(v) => { setRegion(v); setProvince(""); setCity(""); setArea(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Region" /></SelectTrigger>
                        <SelectContent>
                            {regions?.region?.map((r: any) => <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!region_id} value={province_id} onValueChange={(v) => { setProvince(v); setCity(""); setArea(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Province" /></SelectTrigger>
                        <SelectContent>
                            {provinces?.provinces?.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!province_id} value={city_id} onValueChange={(v) => { setCity(v); setArea(""); }}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="City" /></SelectTrigger>
                        <SelectContent>
                            {cities?.cities?.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select disabled={!city_id} value={area_id} onValueChange={setArea}>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200"><SelectValue placeholder="Area" /></SelectTrigger>
                        <SelectContent>
                            {areas?.areas?.map((a: any) => <SelectItem key={a._id} value={a._id}>{a.area_name}</SelectItem>)}
                        </SelectContent>
                    </Select>

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
                            <Button variant="ghost" size="sm" className="text-red-400" onClick={handleRemoveHeadOffice}>
                                <Trash2 size={14} /> Remove
                            </Button>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">No head office selected.</div>
                    )}

                    <Button type="button" variant="secondary" onClick={() => setHeadOfficeOpen(true)}>
                        Select Head Office
                    </Button>

                    <div className="mt-6 mb-2 flex items-center gap-2">
                        <div className="h-px bg-slate-700 flex-1" />
                        <span className="text-xs text-slate-400 whitespace-nowrap">Additional Information (Optional)</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    <Input placeholder="Landlord" {...register("landlord")} />
                    <Input placeholder="Real Estate Company" {...register("real_estate")} />
                    <Input placeholder="Client Company" {...register("client_company")} />

                    <Button type="submit" className="bg-cyan-700 hover:bg-cyan-600">Save Camp</Button>
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
                                onClick={handleSelectHeadOffice}
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
