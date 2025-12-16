"use client"
import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useSession } from 'next-auth/react';
import { useGetAllAreas, useGetAllRegions, useUpdateStaff } from '@/query/client/adminQueries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { toast } from 'sonner';

const formSchema = z.object({
    Email: z.string().min(2),
    Name: z.string().min(2),
    Region: z.string().optional(),
    Area: z.string().optional(),
    Phone: z.string().optional(),
    Country: z.string().optional(),
    Province: z.string().optional(),
    City: z.string().optional(),
    Pin: z.string().optional(),
})

const EditStaffDialog = ({ trigger, staffData }: { trigger: React.ReactNode, staffData: any }) => {
    const { data: session }: any = useSession();
    const { mutateAsync: updateStaff, isPending: updatingStaff } = useUpdateStaff()
    const { data: allRegions, isLoading: regionsLoading } = useGetAllRegions(session?.user?.id);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            Email: staffData?.Email,
            Name: staffData?.Name,
            Region: staffData?.Region?._id,
            Area: staffData?.Area?._id,
            Phone: staffData?.Phone || '',
            Country: staffData?.Address?.Country,
            Province: staffData?.Address?.Province,
            City: staffData?.Address?.City || '',
            Pin: staffData?.Address?.Pin || ''
        },
    })
    const selectedRegion = form.watch('Region');
    const { data: allAreas, isLoading: areasLoading, refetch: refetchAreas } = useGetAllAreas(selectedRegion || '');
    useEffect(() => {
        if (selectedRegion) {
            refetchAreas();
        }
    }, [selectedRegion, refetchAreas]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append("usereditform", JSON.stringify({
            staffid: staffData?._id,
            Name: values.Name,
            Email: values.Email,
            Region: values.Region,
            Area: values.Area,
            Phone: values.Phone,
            Country: values.Country,
            Province: values.Province,
            City: values.City,
            Pin: values.Pin
        }));
        const response = await updateStaff(formData);
        if (response?.existing) {
            return toast.error("Staff Data Updation Failed", {
                description: "The New Email is used by another staff."
            })
        }
        return toast.success("Staff Data Successfully Updated.")
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent className='max-h-[85dvh] overflow-y-scroll'>
                <DialogHeader>
                    <DialogTitle>Edit Staff Details ?</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="Name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your name.." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your email.." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Region"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Region</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl className='border-border'>
                                            <SelectTrigger>
                                                <SelectValue placeholder={staffData?.Region?.RegionName} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allRegions?.map((regions: any) => (
                                                <SelectItem key={regions?._id} value={regions?._id}>{regions?.RegionName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Area"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Area</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl className='border-border'>
                                            <SelectTrigger>
                                                <SelectValue placeholder={staffData?.Area?.Areaname} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allAreas?.map((area: any) => (
                                                <SelectItem key={area?._id} value={area?._id}>{area?.Areaname}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="phone number with country code" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <Input placeholder="native country" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Province"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country Province</FormLabel>
                                    <FormControl>
                                        <Input placeholder="state or province of staff" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="City"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                        <Input placeholder="local city name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Pin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pin code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="pin or postal code" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={updatingStaff}>{updatingStaff ? 'Updating..' : 'Update'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default EditStaffDialog
