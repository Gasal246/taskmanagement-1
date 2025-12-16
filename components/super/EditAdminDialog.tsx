"use client"
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useEditAdmin } from '@/query/client/superuserQueries';
import { toast } from 'sonner';

const formSchema = z.object({
    name: z.string().min(2),
    email: z.string().email()
})


const EditAdminDialog = ({ trigger, adminData }: { trigger: React.ReactNode, adminData: any }) => {
    const { mutateAsync: editAdmin, isPending: edittingAdmin } = useEditAdmin();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: adminData?.Name,
            email: adminData?.Email
        },
    })
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await editAdmin({ adminId: adminData?._id, email: values.email, name: values.name });
        // if(response?.existing){
        //     return toast.error("Admin Updation Failed", {
        //         description: "Existing Email Address."
        //     })
        // }
        return toast.success("Successfully Edited Admin Information.")
    }

    return (
        <Dialog>
            <DialogTrigger className='text-sm font-medium bg-slate-800 hover:bg-slate-700 p-1 w-full rounded-sm'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>: {adminData?.Name}</DialogTitle>
                    <DialogDescription>
                        This action will change or update the admin details.!
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admin Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter admin name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admin Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter admin email" disabled {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">{edittingAdmin ? 'Updating...' : 'Update'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default EditAdminDialog