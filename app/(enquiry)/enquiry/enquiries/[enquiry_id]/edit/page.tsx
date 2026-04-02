"use client"
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGetEnquiryByIdForStaffs, usePutEnquiryEditReq } from '@/query/enquirymanager/queries';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Building2, Wifi } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod'

const Page = () => {
    const params = useParams<{ enquiry_id: string }>();
    const router = useRouter();

    const { data: enquiry, isLoading } = useGetEnquiryByIdForStaffs(params.enquiry_id);
    const { mutateAsync: EditEnquiry, isPending } = usePutEnquiryEditReq();

    const priorityLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

    const enquirySchema = z.object({
        enquiry_id: z.string(),
        // latitude: z.string(),
        // longitude: z.string(),

        wifi_available: z.enum(["Yes", "No"]),
        expected_monthly_price: z.string().optional(),
        other_wifi_details: z.string().optional(),
        wifi_type: z.string().optional(),
        contractor_name: z.string().optional(),
        contract_start: z.string().optional(),
        contract_expiry: z.string().optional(),
        wifi_plan: z.string().optional(),
        speed_mbps: z.string().optional(),
        plain_points: z.string().optional(),

        provider_plan: z.string().optional(),
        personal_wifi_start: z.string().optional(),
        personal_wifi_end: z.string().optional(),
        personal_wifi_price: z.string().optional(),

        lease_expiry_due: z.string().optional(),
        rent_terms: z.string().optional(),

        competition_status: z.enum(["Yes", "No"]),
        competition_notes: z.string().optional(),

        priority: z.enum(priorityLevels as [string, ...string[]]).optional(),

        alert_date: z.string().optional(),
        next_action: z.string(),
        next_action_due: z.string(),

        images: z.any().optional()
    })

    const form = useForm({
        resolver: zodResolver(enquirySchema)
    });

    const { control, handleSubmit } = form;

    useEffect(() => {
        console.log("enquiry edit: ", enquiry);

        if (enquiry) {
            form.reset({
                enquiry_id: params.enquiry_id,
                // latitude: enquiry?.enquiry?.latitude ?? "",
                // longitude: enquiry?.enquiry?.longitude ?? "",

                wifi_available: enquiry?.enquiry?.wifi_available ? "Yes" : "No",
                expected_monthly_price: enquiry?.enquiry?.expected_monthly_price ?? "",
                other_wifi_details: enquiry?.enquiry?.other_wifi_details ?? "",
                wifi_type: enquiry?.enquiry?.wifi_type ?? "",
                contractor_name: enquiry?.external_provider?.contractor_name ?? "",
                contract_start: formatDate(enquiry?.external_provider?.contract_start_date) ?? "",
                contract_expiry: formatDate(enquiry?.external_provider?.contract_end_date) ?? "",
                wifi_plan: enquiry?.external_provider?.contract_package ?? "",
                speed_mbps: enquiry?.external_provider?.contract_speed ?? "",
                plain_points: enquiry?.external_provider?.plain_points ?? "",

                provider_plan: enquiry?.personal_provider?.personal_plan ?? "",
                personal_wifi_start: formatDate(enquiry?.personal_provider?.personal_start_date) ?? "",
                personal_wifi_end: formatDate(enquiry?.personal_provider?.personal_end_date) ?? "",
                personal_wifi_price: enquiry?.personal_provider?.personal_monthly_price.$numberDecimal ?? "",

                lease_expiry_due: formatDate(enquiry?.enquiry?.lease_expiry_due) ?? "",
                rent_terms: enquiry?.enquiry?.rent_terms ?? "",

                competition_status: enquiry?.enquiry?.competition_status ? "Yes" : "No",
                competition_notes: enquiry?.enquiry?.competition_notes ?? "",

                priority: enquiry?.enquiry?.priority ? String(enquiry?.enquiry?.priority) : undefined,

                alert_date: formatDate(enquiry?.enquiry?.alert_date) ?? "",
                next_action: enquiry?.enquiry?.next_action ?? "",
                next_action_due: formatDate(enquiry?.enquiry?.next_action_due) ?? ""
            })
        }
    }, [enquiry, form, params.enquiry_id])

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split("T")[0]; // -> YYYY-MM-DD
    };


    const onFormSubmit = async (data: any) => {
        console.log("submitted data: ", data);

        const res = await EditEnquiry(data);
        if (res?.status == 200) {
            toast.success(res?.message || "Edit Request Forwarded");
            return router.back();
        } else {
            return toast.error(res?.message || "Failed to Edit");
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-cyan-400" />
            </div>
        );
    }

    return (
        <div className="p-5 pb-10">
            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg mt-2">
                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
                    <Building2 size={16} /> Edit Enquiry
                </h1>
            </div>
            <Form {...form}>
                <form onSubmit={handleSubmit(onFormSubmit)} className='space-y-8'>
                    {/* <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm text-slate-300">Latitude</FormLabel>
                                <Input
                                    {...field}
                                    placeholder="Enter Latitude"
                                    className="bg-slate-900/50 text-slate-200"
                                />
                            </FormItem>
                        )}
                    /> */}

                    {/* <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm text-slate-300">Longitude</FormLabel>
                                <Input
                                    {...field}
                                    placeholder="Enter Longitude"
                                    className="bg-slate-900/50 text-slate-200"
                                />
                            </FormItem>
                        )}
                    /> */}

                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1"><Wifi size={14} /> Wi-Fi / Internet</div>

                    <FormField control={form.control} name="wifi_available" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Available?</FormLabel>
                            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                                <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue placeholder="Select Wi-Fi Availability" /></SelectTrigger>
                                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </FormItem>
                    )} />

                    {form.watch("wifi_available") == "No" && (
                        <FormField
                            control={form.control}
                            name="expected_monthly_price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm text-slate-300">Expected Monthly Price</FormLabel>
                                    <Input
                                        {...field}
                                        placeholder="Expected Price"
                                        className="bg-slate-900/50 text-slate-200"
                                    />
                                </FormItem>
                            )}
                        />
                    )}

                    {form.watch("wifi_available") == "Yes" && (
                        <>

                            <FormField control={form.control} name='wifi_type' render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Type</FormLabel>
                                    <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Existing Contractor">Existing Contractor</SelectItem>
                                                <SelectItem value="Personal WiFi">Personal WiFi</SelectItem>
                                                <SelectItem value="Other Sources">Other Sources</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </FormItem>
                            )} />

                            {/* Existing Contractor */}
                            {form.watch("wifi_type") == "Existing Contractor" && (
                                <>
                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Contractor Name
                                        </label>
                                        <Input {...form.register("contractor_name")} placeholder='Contractor Name' />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-medium">
                                            Contract Start Date
                                        </label>

                                        <Input type="date" {...form.register("contract_start")} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-medium">
                                            Contract End Date
                                        </label>
                                        <Input type="date" {...form.register("contract_expiry")} />
                                    </div>

                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Wi-Fi Plan Name
                                        </label>
                                        <Input {...form.register("wifi_plan")} placeholder="Plan / Package" />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Speed in MBPS
                                        </label>
                                        <Input type="number" {...form.register("speed_mbps")} placeholder="Speed (Mbps)" />
                                    </div>

                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Plain Points
                                        </label>
                                        <Textarea {...form.register("plain_points")} placeholder="Client Pain Points" />
                                    </div>
                                </>
                            )}

                            {/* Personal WiFi */}
                            {form.watch("wifi_type") == "Personal WiFi" && (
                                <>

                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Provider / Plan
                                        </label>
                                        <Input {...form.register("provider_plan")} placeholder="Provider / Plan" />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-medium">
                                            Start Date
                                        </label>
                                        <Input type="date" {...form.register("personal_wifi_start")} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-medium">
                                            End Date
                                        </label>
                                        <Input type="date" {...form.register("personal_wifi_end")} />
                                    </div>

                                    <div className='flex flex-col gap-1'>
                                        <label className='text-xs text-slate-400 font-medium'>
                                            Monthly Price
                                        </label>
                                        <Input type="number" {...form.register("personal_wifi_price")} placeholder="Monthly Price" />
                                    </div>
                                </>
                            )}

                            {/* Other Sources */}
                            {form.watch("wifi_type") == "Other Sources" && (
                                <Textarea {...form.register("other_wifi_details")} placeholder="Describe Internet Setup" />
                            )}

                        </>
                    )}

                    {/* Lease Expiry Date */}
                    <FormField control={form.control} name="lease_expiry_due" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs text-slate-300">Lease Expiry Date</FormLabel>
                            <Input type="date" {...field} />
                        </FormItem>
                    )} />

                    {/* Rent Terms */}
                    <Textarea {...form.register("rent_terms")} placeholder="Rent Terms" />

                    {/* Competition Presence */}
                    <FormField control={form.control} name="competition_status" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-slate-300 font-semibold">Competition Presence</FormLabel>
                            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                                <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue placeholder="Competition Status" /></SelectTrigger>
                                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </FormItem>
                    )} />

                    <Textarea {...form.register("competition_notes")} placeholder='Competition Notes' />

                    {/* Priority */}
                    <FormField control={form.control} name="priority" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-slate-300 font-semibold">Priority (1 - Low, 10 - High)</FormLabel>
                            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                                <Select key={field.value} value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                                    <SelectContent>{priorityLevels.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </FormItem>
                    )} />

                    {/* Dates + Notes */}
                    <FormField control={form.control} name="alert_date" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs text-slate-300">Alert Date</FormLabel><Input type="date" {...field} /></FormItem>
                    )} />

                    <Textarea {...form.register("next_action")} placeholder="Next Action" />

                    <FormField control={form.control} name="next_action_due" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs text-slate-300">Next Action Due Date</FormLabel>
                            <Input type="date" {...field} />
                        </FormItem>
                    )} />

                    {/* IMAGES */}
                    <div>
                        <FormLabel className="text-xs text-slate-300">Upload Images (Optional)</FormLabel>
                        <input type="file" multiple accept="image/*" {...form.register("images")} />
                    </div>

                    {/* SUBMIT */}
                    <Button type="submit" disabled={isPending} className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold">
                        {isPending ? "Saving" : "Save Enquiry"}
                    </Button>
                </form>
            </Form>
        </div>
    )
}

export default Page
