"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetEqCountries, useGetEqRegionProfile, useUpdateEqRegion } from "@/query/enquirymanager/queries";

export default function EditRegionPage() {
    const router = useRouter();
    const params = useParams<{ region_id: string }>();
    const [countries, setCountries] = useState([]);

    const form = useForm({
        defaultValues: {
            country: "",
            region_name: "",
        },
    });

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: UpdateRegion, isPending: isUpdating } = useUpdateEqRegion();
    const { data: regionData, isLoading } = useGetEqRegionProfile(params.region_id);

    const normalizeId = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (value?.$oid) return value.$oid;
        if (value?._id) return value._id;
        if (typeof value.toString === "function") return value.toString();
        return "";
    };

    const regionProfile = regionData?.region;
    const fallbackCountry = regionProfile?.country_id
        ? { id: normalizeId(regionProfile.country_id), label: regionProfile.country_id?.country_name }
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
        if (!regionProfile) return;
        form.reset({
            country: normalizeId(regionProfile.country_id),
            region_name: regionProfile.region_name || "",
        });
    }, [regionProfile]);

    const onSubmit = async (values: any) => {
        const payload = {
            region_id: params.region_id,
            region_name: values.region_name,
            country: values.country,
        };

        const res = await UpdateRegion(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Region Updated");
            return router.replace(`/admin/enquiries/regions/${params.region_id}`);
        }
        toast.error(res?.message || "Failed to update region");
    };

    if (isLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading region...</div>
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
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/regions")}>Manage Regions</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Region</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Edit Region
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

                        <FormField control={form.control} name="region_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300 text-sm">Region Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter region name" className="bg-slate-900/50 text-slate-200" {...field} />
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
