"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { toast } from 'sonner'
import { useAddDepartmentRegion, useGetAllRegions } from '@/query/client/adminQueries'
import { useSession } from 'next-auth/react'

const formSchema = z.object({
    regionid: z.string().min(2),
})

const AddDepartmentRegion = ({ trigger, depid }: { trigger: React.ReactNode, depid: string }) => {
    const { data: session }: any = useSession();
    const { data: regions, isLoading: loadingRegions } = useGetAllRegions(session?.user?.id);
    const { mutateAsync: addRegion, isPending: addingRegion } = useAddDepartmentRegion();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            regionid: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await addRegion({ depid: depid, regionid: values?.regionid });
        if(response?._id){
            return toast.success("Department Region Successfully Added.");
        }
        return toast.error("Failed to add Department Region.")
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Department Region</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="regionid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Regions</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a department region" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                regions?.map((region: any) => (
                                                    <SelectItem key={region?._id} value={region?._id}>{region?.RegionName}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{addingRegion ? "Updating.." : 'Update'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddDepartmentRegion