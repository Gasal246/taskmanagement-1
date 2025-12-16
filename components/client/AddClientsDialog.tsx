"use client"
import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { motion } from 'framer-motion'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import 'react-phone-number-input/style.css'
import RegionAndAreaFilter from '../shared/RegionAndAreaFilter'
import { Textarea } from '../ui/textarea'
import { useAddClients } from '@/query/client/clientQueries'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon } from 'lucide-react'

const formSchema = z.object({
    shortname: z.string().min(2),
    fullname: z.string().min(2),
    address: z.string(),
})

const AddClientsDialog = ({ currentUser, trigger }: { currentUser: any, trigger?: React.ReactNode }) => {
    const [region, setRegion] = useState('');
    const [area, setArea] = useState('');
    const [contactInfo, setContactInfo] = useState<any[]>([
        {
            Name: '',
            Email: '',
            Designation: '',
            Phone: ''
        }
    ])
    const { mutateAsync: addClient, isPending: addingClient } = useAddClients()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            shortname: "",
            fullname: "",
            address: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('clientform', JSON.stringify({
            shortname: values.shortname,
            fullname: values.fullname,
            details: values.address,
            region: region,
            area: area,
            contactinfo: contactInfo
        }));
        const response = await addClient(formData);
        if (response?._id) {
            return toast.success("Client Added Successfully");
        } else {
            return toast.error("New Client Not Added", { description: "Check you filled all the details, & make sure it's unique from other client details." })
        }
    }

    const addContactField = () => {
        const lastContact = contactInfo[contactInfo.length - 1];
        if (Object.values(lastContact).every((field: any) => field.trim() !== '')) {
            setContactInfo([...contactInfo, { Name: '', Email: '', Designation: '', Phone: '' }]);
        }
    };

    const handleContactInfoChange = (index: any, field: any, value: any) => {
        const newContactInfo = [...contactInfo];
        newContactInfo[index][field] = value;
        setContactInfo(newContactInfo);
    };

    const deleteContactField = (index: any) => {
        const newContactInfo = contactInfo.filter((_, idx) => idx !== index);
        setContactInfo(newContactInfo);
    };

    const canAddMore = Object.values(contactInfo[contactInfo.length - 1]).every(
        (field: any) => field.trim() !== ''
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}><Button>Add Client</Button></motion.div>}
            </DialogTrigger>
            <DialogContent className='max-h-[90dvh] overflow-y-scroll'>
                <DialogHeader>
                    <DialogTitle>Add Client</DialogTitle>
                    <DialogDescription>You can add more information like contact and other after viewing the added clients.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                        <FormField
                            control={form.control}
                            name="shortname"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Short Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Client Short Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="fullname"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Client Full Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <h1 className='mt-3 text-sm'>Select Region & Area</h1>
                        <RegionAndAreaFilter setRegion={setRegion} setArea={setArea} currentUser={currentUser} placeholder='select region' />
                        <div className="flex flex-col gap-2">
                            <h1>Add Contact Information</h1>
                            {contactInfo.map((info, idx) => (
                                <div key={idx} className="border-2 border-dashed p-2 w-full flex flex-col gap-1">
                                    <Input
                                        placeholder="Name"
                                        value={info.Name}
                                        onChange={(e) => handleContactInfoChange(idx, 'Name', e.target.value)}
                                    />
                                    <Input
                                        placeholder="Designation"
                                        value={info.Designation}
                                        onChange={(e) => handleContactInfoChange(idx, 'Designation', e.target.value)}
                                    />
                                    <Input
                                        placeholder="Email"
                                        value={info.Email}
                                        onChange={(e) => handleContactInfoChange(idx, 'Email', e.target.value)}
                                    />
                                    <Input
                                        placeholder="Phone"
                                        value={info.Phone}
                                        onChange={(e) => handleContactInfoChange(idx, 'Phone', e.target.value)}
                                    />
                                    {idx > 0 && (
                                        <Button
                                            onClick={() => deleteContactField(idx)}
                                            variant="ghost"
                                            className="flex items-center gap-1 text-red-500"
                                        >
                                            <TrashIcon size={18} /> Delete
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addContactField}
                                disabled={!canAddMore}
                                className="flex gap-2 bg-transparent border-2 border-dashed text-slate-300 hover:text-black"
                            >
                                <PlusIcon size={22} /> Add More
                            </Button>
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Address & Details.." className='overscroll-y-contain' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="pt-5"><Button type="submit">{addingClient ? 'Adding..' : 'Add Client'}</Button></div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddClientsDialog