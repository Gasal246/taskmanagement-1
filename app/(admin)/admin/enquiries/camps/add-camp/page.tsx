"use client";

import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqAreas, useGetEqProvince, useAddNewEqCamp } from "@/query/enquirymanager/queries";
import { EQ_CAMP_CAPACITY, EQ_CAMP_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function AddCampPage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = React.useState("");
    const [region_id, setRegion] = React.useState("");
    const [province_id, setProvince] = React.useState("");
    const [city_id, setCity] = React.useState("");
    const [area_id, setArea] = React.useState("");

    const { mutateAsync: GetCountries, isPending: isCountryLoading } = useGetEqCountries();
    const { mutateAsync: AddNewCamp, isPending: isCampAdding } = useAddNewEqCamp();
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities } = useGetEqCities(province_id);
    const { data: areas } = useGetEqAreas(city_id);

    const capacityOptions = ["<500", "500-1000", "1000-1500", "1500-2000", "2000-2500", "2500-3000", "3000+"];
const capacityLimits: Record<string, number> = {
    "<500": 500, "500-1000": 1000, "1000-1500": 1500, "1500-2000": 2000, "2000-2500": 2500, "2500-3000": 3000, "3000+": 99999
};

    const fetchCountries = async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    }

    useEffect(() => {
        fetchCountries();
    }, []);

    const { register, handleSubmit, reset, control } = useForm();

    const onSubmit = async (data: any) => {
        const limit = capacityLimits[data.camp_capacity];
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
            area_id: area_id
        };

        const res = await AddNewCamp(submitData);
        if (res?.status == 201) {
            toast.success(res?.message || "Camp Created");
        } else {
            toast.error(res?.message || "Failed to add camp");
        }
        reset();
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
                                    {capacityOptions.map((c) => (
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
                        <span className="text-xs text-slate-400 whitespace-nowrap">Head Office Details (Optional)</span>
                        <div className="h-px bg-slate-700 flex-1" />
                    </div>

                    <Input placeholder="Head Office Phone" {...register("ho_phone")} />
                    <Input placeholder="Head Office Location" {...register("ho_location")} />
                    <Textarea placeholder="Head Office Address" {...register("ho_address")} />
                    <Textarea placeholder="Other Head Office Details" {...register("ho_other_details")} />

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
        </div>
    );
}
