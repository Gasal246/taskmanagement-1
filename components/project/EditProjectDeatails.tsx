"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from '../ui/textarea'
import { useUpdateProjectDeatils } from '@/query/client/projectQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().min(2).max(300).optional(),
})

const EditProjectDeatails = ({ trigger, projectid, change, previous }: { trigger: React.ReactNode, projectid: string, previous: string, change: 'description' | 'title' }) => {
    const { mutateAsync: updateProject, isPending: updatingProject } = useUpdateProjectDeatils();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: previous,
            description: previous,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('projectid', projectid)
        formData.append('change', change);
        const changedValue = change == 'description' ? values.description : values.title;
        formData.append('value',  changedValue!);
        const response = await updateProject(formData);
        if(response?._id){
            return toast.success("Project Successfully Updated!!")
        }else{
            return toast.error("Something went wrong on updating project!!")
        }
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className='capitalize'>Change {change}</DialogTitle>
                    <DialogDescription>This will reflect for all the users who have the access to this project.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {change == 'title' &&<FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter New Title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />}
                        {change == 'description' && <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter Your New Description" className="resize-none" {...field} rows={10} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />}
                        <Button type="submit">{updatingProject ? 'Updating..' : 'Update'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default EditProjectDeatails