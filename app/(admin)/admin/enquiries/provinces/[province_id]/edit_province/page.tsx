"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetEqCountries, useGetEqProvinceProfile, useGetEqRegions, useUpdateEqProvince } from "@/query/enquirymanager/queries";

export default function EditProvincePage() {
    const router = useRouter();
    const params = useParams<{ province_id: string }>();
    const [countries, setCountries] = useState([]);

    const form = useForm({
        defaultValues: {
            country: "",
            region: "",
            province_name: "",
        },
    });

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: UpdateProvince, isPending: isUpdating } = useUpdateEqProvince();
    const { data: provinceData, isLoading } = useGetEqProvinceProfile(params.province_id);

    const country_id = useWatch({ control: form.control, name: "country" });

    const { data: regions } = useGetEqRegions(country_id);

    const normalizeId = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (value?.$oid) return value.$oid;
        if (value?._id) return value._id;
        if (typeof value.toString === "function") return value.toString();
        return "";
    };

    const provinceProfile = provinceData?.province;
    const fallbackCountry = provinceProfile?.country_id
        ? { id: normalizeId(provinceProfile.country_id), label: provinceProfile.country_id?.country_name }
        : null;
    const fallbackRegion = provinceProfile?.region_id
        ? { id: normalizeId(provinceProfile.region_id), label: provinceProfile.region_id?.region_name }
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
        if (!provinceProfile) return;
        form.reset({
            country: normalizeId(provinceProfile.country_id),
            region: normalizeId(provinceProfile.region_id),
            province_name: provinceProfile.province_name || "",
        });
    }, [provinceProfile]);

    const onSubmit = async (values: any) => {
        const payload = {
            province_id: params.province_id,
            province_name: values.province_name,
            country: values.country,
            region: values.region,
        };

        const res = await UpdateProvince(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Province Updated");
            return router.replace(`/admin/enquiries/provinces/${params.province_id}`);
        }
        toast.error(res?.message || "Failed to update province");
    };

    if (isLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading province...</div>
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
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/provinces")}>Manage Provinces</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Province</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Edit Province
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

                        <FormField control={form.control} name="province_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Province Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter province name" className="bg-slate-900/50 text-slate-200" {...field} />
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
