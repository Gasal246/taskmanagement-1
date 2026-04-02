"use client";

import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetEqCountries, useGetEqRegions, useAddNewEqProvince } from "@/query/enquirymanager/queries";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function AddProvincePage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);

    const form = useForm({
        defaultValues: {
            country: "",
            region: "",
            province_name: "",
        },
    });

    const country_id = form.watch("country");

    const { mutateAsync: getCountries } = useGetEqCountries();
    const { data: regions } = useGetEqRegions(country_id);
    const { mutateAsync: AddProvince, isPending: isAdding } = useAddNewEqProvince();

    const fetchCountries = useCallback(async () => {
        const res = await getCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    }, [getCountries]);

    useEffect(() => {
        fetchCountries();
    }, [fetchCountries]);

    useEffect(() => {
        form.setValue("region", "");
    }, [country_id, form]);

    const onSubmit = async (values: any) => {
        const res = await AddProvince(values);
        if (res?.status == 201) {
            toast.success(res?.message || "Province Added");
            form.reset();
            return;
        }
        toast.error(res?.message || "Failed to add province");
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
                        <BreadcrumbLink onClick={() => router.back()}>Manage Provinces</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Add Province</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Add New Province
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
                                        {countries?.map((c: any) => (
                                            <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
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

                        <Button type="submit" disabled={isAdding} className="w-full bg-cyan-700 hover:bg-cyan-600">
                            {isAdding ? "Saving..." : "Save Province"}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
