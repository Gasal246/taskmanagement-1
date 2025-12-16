"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAddContactCard } from '@/query/client/clientQueries'
import { Phone } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
    name: z.string(),
    email: z.string(),
    designation: z.string(),
    phone: z.string(),
})

const AddContactCard = ({ clientid, trigger}: { clientid: string, trigger: React.ReactNode}) => {
    const router = useRouter();
    const { mutateAsync: addnewcontact, isPending: addingContactCard } = useAddContactCard();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            designation: "",
            phone: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('contactForm', JSON.stringify({
            clientId: clientid,
            Name: values.name,
            Designation: values.designation,
            Email: values.email,
            Phone: values.phone
        }));
        const response = await addnewcontact(formData);
        if(response?._id) {
            return toast.success("Contact card successfully added.")
        }else{
            return toast.error("Something went wrong on adding contact card.")
        }
    }
    
    return (
        <Dialog>
            <DialogTrigger asChild className='w-full h-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Contact Card</DialogTitle>
                    <DialogDescription>Add new contact card for client.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contact name" {...field} />
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
                                        <Input placeholder="contact email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="designation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Designation</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contact designation" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contact phone" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{addingContactCard ? 'Adding...' : 'Add Now'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default AddContactCard