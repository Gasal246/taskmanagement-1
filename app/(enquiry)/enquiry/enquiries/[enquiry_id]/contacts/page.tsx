"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Pencil, Plus } from "lucide-react";
import { useAddNewContactAgent, useGetEnquiryContacts } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQ_CONTACT_AUTHORITY } from "@/lib/constants";


export default function CampContactsPage() {
    const router = useRouter();
    const params = useParams<{ enquiry_id: string }>();

    const [addModalOpen, setAddModalOpen] = useState(false);

    const { data: contacts, isLoading, refetch } = useGetEnquiryContacts(params.enquiry_id);
    const { mutateAsync: AddContact, isPending } = useAddNewContactAgent();

    const contactsSchema = z.object({
        contact_name: z.string().min(1, "Name required"),
        contact_phone: z.string().min(5, "Valid Phone requiried"),
        contact_email: z.string().min(1, "Valid E-Mail required"),
        contact_authorization: z.string().min(1, "Contact Authorization required"),
        contact_designation: z.string().min(1, "Contact Designation required"),
        is_decision_maker: z.enum(["Yes", "No"])
    });

    const form = useForm({
        resolver: zodResolver(contactsSchema)
    });

    useEffect(() => {
        console.log("contacts: ", contacts);
    }, [contacts]);

    const AddNewContact = async (data: any) => {
        const payload = {
            ...data,
            enquiry_id: params.enquiry_id
        }

        const res = await AddContact(payload);
        if (res?.status == 201) {
            toast.success(res?.message);
            refetch();
        } else {
            toast.error(res?.message || "Failed to add contact");
        }
        setAddModalOpen(false);
    }

    return (
        <div className="p-6 text-slate-200">

            {/* BACK BUTTON */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
            >
                <ArrowLeft size={16} /> Back
            </motion.button>

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <User size={20} /> Camp Contacts
                </h2>

                <Button
                    onClick={() => setAddModalOpen(true)}
                >Add Contact</Button>
            </div>

            {/* CONTACT LIST */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
                {contacts?.contacts?.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">
                        No contacts available.
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-slate-300 border-b border-slate-700">
                            <tr className="text-left">
                                <th className="py-2">Name</th>
                                <th className="py-2">Phone</th>
                                <th className="py-2">Email</th>
                                <th className="py-2">Designation</th>
                                <th className="py-2">Authorization</th>
                                <th className="py-2">Decision Maker</th>
                            </tr>
                        </thead>

                        <tbody>
                            {contacts?.contacts?.map((c: any) => (
                                <tr
                                    key={c._id}
                                    className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                                >
                                    <td className="py-2">{c.contact_name}</td>
                                    <td className="py-2">{c.contact_phone}</td>
                                    <td className="py-2">{c.contact_email}</td>
                                    <td className="py-2">{c.contact_designation}</td>
                                    <td className="py-2">{c.contact_authorization}</td>
                                    <td className="py-2">{c.is_decision_maker ? "Yes" : "No"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Contact Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(AddNewContact)}
                            className="space-y-4 mt-3"
                        >
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="contact_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Name</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Phone */}
                            <FormField
                                control={form.control}
                                name="contact_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Phone</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="contact_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Email</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Designation */}
                            <FormField
                                control={form.control}
                                name="contact_designation"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Designation</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Authorization */}
                            <FormField
                                control={form.control}
                                name="contact_authorization"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Authorization</Label>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Authority Level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EQ_CONTACT_AUTHORITY.map((c) => (
                                                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Decision Maker */}
                            <FormField
                                control={form.control}
                                name="is_decision_maker"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Is Decision Maker</Label>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="mt-4">
                                <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    disabled={isPending}
                                    type="submit">{isPending ? "Saving" : "Save"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
