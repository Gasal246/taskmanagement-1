"use client";

import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddNewEqCountry } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function AddCountryPage() {
    const router = useRouter();
    const form = useForm({
        defaultValues: {
            country_name: "",
        },
    });

    const { mutateAsync: AddCountry, isPending: isAdding } = useAddNewEqCountry();

    const onSubmit = async (values: any) => {
        const res = await AddCountry(values);
        if (res?.status == 201) {
            toast.success(res?.message || "Country added");
            form.reset();
            return;
        }
        toast.error(res?.message || "Failed to add country");
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
                        <BreadcrumbLink onClick={() => router.back()}>Manage Countries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Add Country</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mx-auto max-w-md p-5">
                <h1 className="text-base font-semibold mb-4 text-slate-200">
                    Add New Country
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isAdding} className="w-full bg-cyan-700 hover:bg-cyan-600">
                            {isAdding ? "Saving..." : "Save Country"}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
