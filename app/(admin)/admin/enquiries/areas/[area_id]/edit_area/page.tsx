"use client";

import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    useGetEqAreaProfile,
    useGetEqCities,
    useGetEqCountries,
    useGetEqProvince,
    useGetEqRegions,
    useUpdateEqArea,
} from "@/query/enquirymanager/queries";

export default function EditAreaPage() {
    const router = useRouter();
    const params = useParams<{ area_id: string }>();
    const [countries, setCountries] = useState([]);

    const form = useForm({
        defaultValues: {
            country: "",
            region: "",
            province: "",
            city: "",
            area_name: "",
        },
    });

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: UpdateArea, isPending: isUpdating } = useUpdateEqArea();
    const { data: areaData, isLoading: isAreaLoading } = useGetEqAreaProfile(params.area_id);

    const country_id = useWatch({ control: form.control, name: "country" });
    const region_id = useWatch({ control: form.control, name: "region" });
    const province_id = useWatch({ control: form.control, name: "province" });

    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities } = useGetEqCities(province_id);

    const normalizeId = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (value?.$oid) return value.$oid;
        if (value?._id) return value._id;
        if (typeof value.toString === "function") return value.toString();
        return "";
    };

    const areaProfile = areaData?.area;
    const fallbackCountry = areaProfile?.country_id
        ? { id: normalizeId(areaProfile.country_id), label: areaProfile.country_id?.country_name }
        : null;
    const fallbackRegion = areaProfile?.region_id
        ? { id: normalizeId(areaProfile.region_id), label: areaProfile.region_id?.region_name }
        : null;
    const fallbackProvince = areaProfile?.province_id
        ? { id: normalizeId(areaProfile.province_id), label: areaProfile.province_id?.province_name }
        : null;
    const fallbackCity = areaProfile?.city_id
        ? { id: normalizeId(areaProfile.city_id), label: areaProfile.city_id?.city_name }
        : null;

    useEffect(() => {
        const fetchCountries = async () => {
            const res = await GetCountries();
            if (res?.status == 200) {
                setCountries(res?.countries);
            }
        };
        fetchCountries();
    }, []);

    useEffect(() => {
        if (!areaProfile) return;
        form.reset({
            country: normalizeId(areaProfile.country_id),
            region: normalizeId(areaProfile.region_id),
            province: normalizeId(areaProfile.province_id),
            city: normalizeId(areaProfile.city_id),
            area_name: areaProfile.area_name || "",
        });
    }, [areaProfile]);

    const onSubmit = async (values: any) => {
        const payload = {
            area_id: params.area_id,
            area_name: values.area_name,
            country: values.country,
            region: values.region,
            province: values.province,
            city: values.city,
        };

        const res = await UpdateArea(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Area Updated");
            return router.replace(`/admin/enquiries/areas/${params.area_id}`);
        }
        toast.error(res?.message || "Failed to update area");
    };

    if (isAreaLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading area...</div>
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
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/areas")}>Manage Areas</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Area</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Edit Area
                </h1>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        {/* COUNTRY */}
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Country</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fallbackCountry?.id && fallbackCountry?.label && !countries?.some((c: any) => c._id === fallbackCountry.id) && (
                                            <SelectItem value={fallbackCountry.id}>{fallbackCountry.label}</SelectItem>
                                        )}
                                        {countries?.map((c: any) => (
                                            <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* REGION */}
                        <FormField control={form.control} name="region" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Region</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={!country_id}>
                                    <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                        <SelectValue placeholder="Select Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fallbackRegion?.id && fallbackRegion?.label && !regions?.region?.some((r: any) => r._id === fallbackRegion.id) && (
                                            <SelectItem value={fallbackRegion.id}>{fallbackRegion.label}</SelectItem>
                                        )}
                                        {regions?.region?.map((r: any) => (
                                            <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        {/* PROVINCE */}
                        <FormField control={form.control} name="province" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Province</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={!region_id}>
                                    <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                        <SelectValue placeholder="Select Province" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fallbackProvince?.id && fallbackProvince?.label && !provinces?.provinces?.some((p: any) => p._id === fallbackProvince.id) && (
                                            <SelectItem value={fallbackProvince.id}>{fallbackProvince.label}</SelectItem>
                                        )}
                                        {provinces?.provinces?.map((p: any) => (
                                            <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        {/* CITY */}
                        <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">City</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={!province_id}>
                                    <SelectTrigger className="bg-slate-900/50 text-slate-200">
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fallbackCity?.id && fallbackCity?.label && !cities?.cities?.some((c: any) => c._id === fallbackCity.id) && (
                                            <SelectItem value={fallbackCity.id}>{fallbackCity.label}</SelectItem>
                                        )}
                                        {cities?.cities?.map((c: any) => (
                                            <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        {/* AREA NAME */}
                        <FormField control={form.control} name="area_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Area Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter area name" className="bg-slate-900/50 text-slate-200" {...field} />
                                </FormControl>
                            </FormItem>
                        )} />

                        <Button type="submit" disabled={isUpdating} className="w-full bg-cyan-700 hover:bg-cyan-600">
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
