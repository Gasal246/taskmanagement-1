/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { useEditDepartment, useGetDepartmentById } from '@/query/client/superuserQueries'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"
import { toast } from 'sonner';

const formSchema = z.object({
    DepartmentName: z.string().min(2).max(50),
    MaximumStaffs: z.string(),
    AllowProjects: z.boolean(),
    AllowTasks: z.boolean()
})

const EditDepartmentDialog = ({ trigger, departmentId }: { trigger: React.ReactNode, departmentId: string }) => {
    const { data: departmentData, isLoading: departmentDataLoading } = useGetDepartmentById(departmentId);
    const { mutateAsync: editDepartment, isPending: editingDepartment } = useEditDepartment();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            DepartmentName: departmentData?.DepartmentName,
            MaximumStaffs: departmentData?.MaximumStaffs,
            AllowProjects: departmentData?.AllowProjects,
            AllowTasks: departmentData?.AllowTasks,
        },
    })

    useEffect(() => {
        if (departmentData) {
            form.setValue('DepartmentName', departmentData?.DepartmentName);
            form.setValue('MaximumStaffs', departmentData?.MaximumStaffs);
            form.setValue('AllowProjects', departmentData?.AllowProjects);
            form.setValue('AllowTasks', departmentData?.AllowTasks);
        }
    }, [departmentData]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await editDepartment({
            departmentid: departmentId,
            DepartmentName: values.DepartmentName,
            MaximumStaffs: values.MaximumStaffs,
            AllowProjects: values.AllowProjects,
            AllowTasks: values.AllowTasks
        })
        if (response?._id) {
            return toast.success("Department Successfully Edited.");
        }
        return toast.error("Something wrong happened", {
            description: "please try again"
        })
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent >
                {departmentDataLoading && <div className="font-semibold text-2xl items-center justify-center flex">Loading Data...</div>}
                <div className={departmentDataLoading ? 'blur-xl' : ''}>
                    <DialogHeader>
                        <DialogTitle>{departmentDataLoading ? 'Loading...' : departmentData?.DepartmentName}</DialogTitle>
                        <DialogDescription>
                            this will update admin{"'"}s existing department.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                            <FormField
                                control={form.control}
                                name="DepartmentName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Department Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Department Name" {...field}  />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="MaximumStaffs"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number Of Staffs</FormLabel>
                                        <FormControl>
                                            <Input type='number' placeholder="Staffs Allowed" {...field} onChange={(e) => form.setValue('MaximumStaffs', e.target.value+'')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="AllowProjects"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Allow Project </FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="AllowTasks"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Allow Tasks </FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={editingDepartment}>{editingDepartment ? 'Updating...' : 'Update'}</Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog >
    )
}

export default EditDepartmentDialog

