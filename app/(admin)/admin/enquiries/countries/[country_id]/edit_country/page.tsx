"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetEqCountryProfile, useUpdateEqCountry } from "@/query/enquirymanager/queries";

export default function EditCountryPage() {
    const router = useRouter();
    const params = useParams<{ country_id: string }>();

    const form = useForm({
        defaultValues: {
            country_name: "",
        },
    });

    const { data: countryData, isLoading } = useGetEqCountryProfile(params.country_id);
    const { mutateAsync: UpdateCountry, isPending: isUpdating } = useUpdateEqCountry();

    useEffect(() => {
        if (!countryData?.country) return;
        form.reset({
            country_name: countryData.country.country_name || "",
        });
    }, [countryData?.country]);

    const onSubmit = async (values: any) => {
        const payload = {
            country_id: params.country_id,
            country_name: values.country_name,
        };

        const res = await UpdateCountry(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Country Updated");
            return router.replace(`/admin/enquiries/countries/${params.country_id}`);
        }
        toast.error(res?.message || "Failed to update country");
    };

    if (isLoading) {
        return (
            <div className="p-5 pb-10">
                <div className="text-sm text-slate-400">Loading country...</div>
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
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries/countries")}>Manage Countries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Country</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Edit Country
                </h1>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="country_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-300 text-sm">Country Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter country name"
                                            className="bg-slate-900/50 text-slate-200"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isUpdating} className="w-full bg-cyan-700 hover:bg-cyan-600">
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
