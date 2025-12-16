"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { useAddDepartmentArea, useGetAllAreas } from '@/query/client/adminQueries'
import { toast } from 'sonner'
import { DialogDescription } from '@radix-ui/react-dialog'

const formSchema = z.object({
    areaid: z.string().min(2),
})

const AddDepartmentArea = ({ trigger, departmentId, regionId }: { trigger: React.ReactNode, departmentId: string, regionId: string }) => {
    const { data: areas, isLoading: loadingAreas } = useGetAllAreas(regionId);
    const { mutateAsync: addDepartmentArea, isPending: updatingAreas } = useAddDepartmentArea();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            areaid: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await addDepartmentArea({ depid: departmentId, regionid: regionId, areaid: values?.areaid });
        if(response?._id){
            return toast.success("Area Successfully added to department.")
        }
        if(response?.existing){
            return toast.error("This Area is already added.")
        }
        return toast.error("Area cannot be added.", {
            description: "Unknown error or already existing input."
        });
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Department Area</DialogTitle>
                    <DialogDescription className='text-sm text-slate-500'>{"Please don't select existing areas."}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="areaid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Areas</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a area to add" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                areas?.map((area: any) => (
                                                    <SelectItem key={area?._id} value={area?._id}>{area?.Areaname}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{updatingAreas ? "Updating.." : 'Update'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddDepartmentArea