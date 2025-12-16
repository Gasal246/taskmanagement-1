"use client"
import React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useEditProfileInfo } from '@/query/client/adminQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().min(2)
})

const EditUserInfoDialog = ({ trigger, userData }: { trigger: React.ReactNode, userData: any }) => {
    const { mutateAsync: editProfile, isPending: editting } = useEditProfileInfo();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: userData?.Name,
            email: userData?.Email
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await editProfile({ userid: userData?._id, email: values.email, name: values.name });
        if(response?.existing){
            return toast.error("Sorry, There is another user with same email.")
        }
        return toast.success("Profile Successfully Edited.")
    }

    return (
        <Dialog>
            <DialogTrigger className='w-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User Info.</DialogTitle>
                    <DialogDescription>you are trying to update your profile info</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your new name." {...field} />
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
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your new email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{editting ? 'Updating...' : 'Update'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default EditUserInfoDialog