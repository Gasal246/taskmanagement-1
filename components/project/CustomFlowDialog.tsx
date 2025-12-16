"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from '../ui/textarea';
import { useAddProjectFlow } from '@/query/client/projectQueries';
import { toast } from 'sonner';

const formSchema = z.object({
    title: z.string().min(2),
    description: z.string().min(2).max(300)
})

const CustomFlowDialog = ({ trigger, projectid }: { trigger: React.ReactNode, projectid: string }) => {
    const { mutateAsync: addProjectFlow, isPending: addingProjectFlow } = useAddProjectFlow();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('projectid', projectid);
        formData.append('title', values.title);
        formData.append('description', values.description);
        const response = await addProjectFlow(formData);
        if(response?._id){
            return toast.success("Flow added successfully!!")
        }else{
            return toast.error("Something went wrong on adding project flow!")
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Custom Flow</DialogTitle>
                    <DialogDescription>You could also add custom flow to the working tree, This will help better understand the flow.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Flow Title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brief the flow here" rows={5} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">{addingProjectFlow ? 'Adding...' : 'Add Flow'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default CustomFlowDialog