"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAddDemoDep } from '@/query/client/superuserQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    depName: z.string().min(2),
    maxCount: z.string().max(2),
    allowTasks: z.boolean(),
    allowProjects: z.boolean()
})

const AddDepartmentsDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { mutateAsync: addDemoDepartment, isPending: addingDemoDep } = useAddDemoDep();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            depName: "",
            maxCount: "",
            allowTasks: false,
            allowProjects: false
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('depName', values.depName);
        formData.append('maxCount', values.maxCount);
        formData.append('allowTasks', values.allowTasks+'');
        formData.append('allowProjects', values.allowProjects+'');
        const response = await addDemoDepartment(formData);
        if(response?._id){
            return toast.success("Successfully Added A Department Modal.")
        }else{
            return toast.error("Department Modal Creation Failed.")
        }
    }
    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Build New Department</DialogTitle>
                    <DialogDescription>Departments you made here will be displayed when you creating a new admin (company).</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="depName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="this will be displayed on selection list." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="maxCount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Maximum Staffs Allowed</FormLabel>
                                    <FormControl>
                                        <Input type='number' placeholder="the maximum number of staffs this department should handle." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="allowProjects"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Allow Project Contibutions</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="allowTasks"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Allow Task Contibutions</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{addingDemoDep ? 'Building Modal..' : 'Build This'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default AddDepartmentsDialog