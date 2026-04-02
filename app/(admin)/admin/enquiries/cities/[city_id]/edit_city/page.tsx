"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetEqCityProfile, useGetEqCountries, useGetEqRegions, useGetEqProvince, useUpdateEqCity } from "@/query/enquirymanager/queries";

export default function EditCityPage() {
    const router = useRouter();
    const params = useParams<{ city_id: string }>();
    const [countries, setCountries] = useState([]);

    const form = useForm({
        defaultValues: {
            country: "",
            region: "",
            province: "",
            city_name: "",
        },
    });

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: UpdateCity, isPending: isUpdating } = useUpdateEqCity();
    const { data: cityData, isLoading } = useGetEqCityProfile(params.city_id);

    const country_id = useWatch({ control: form.control, name: "country" });
    const region_id = useWatch({ control: form.control, name: "region" });

    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);

    const normalizeId = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (value?.$oid) return value.$oid;
        if (value?._id) return value._id;
        if (typeof value.toString === "function") return value.toString();
        return "";
    };

    const cityProfile = cityData?.city;
    const fallbackCountry = cityProfile?.country_id
        ? { id: normalizeId(cityProfile.country_id), label: cityProfile.country_id?.country_name }
        : null;
    const fallbackRegion = cityProfile?.region_id
        ? { id: normalizeId(cityProfile.region_id), label: cityProfile.region_id?.region_name }
        : null;
    const fallbackProvince = cityProfile?.province_id
        ? { id: normalizeId(cityProfile.province_id), label: cityProfile.province_id?.province_name }
        : null;

    const fetchCountries = useCallback(async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    }, [GetCountries]);

    useEffect(() => {
        fetchCountries();
    }, [fetchCountries]);

    useEffect(() => {
        if (!cityProfile) return;
        form.reset({
            country: normalizeId(cityProfile.country_id),
            region: normalizeId(cityProfile.region_id),
            province: normalizeId(cityProfile.province_id),
            city_name: cityProfile.city_name || "",
        });
    }, [cityProfile, form]);

    const onSubmit = async (values: any) => {
        const payload = {
            city_id: params.city_id,
            city_name: values.city_name,
            country: values.country,
            region: values.region,
            province: values.province,
        };

        const res = await UpdateCity(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "City Updated");
            return router.replace(`/admin/enquiries/cities/${params.city_id}`);
        }
        toast.error(res?.message || "Failed to update city");
    };

    if (isLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading city...</div>
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
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/cities")}>Manage Cities</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit City</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Edit City
                </h1>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                            </FormItem>
                        )} />

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

                        <FormField control={form.control} name="city_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">City Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter city name" className="bg-slate-900/50 text-slate-200" {...field} />
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
