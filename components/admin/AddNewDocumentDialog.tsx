"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAddNewStaffDocument } from '@/query/client/adminQueries';
import { toast } from 'sonner';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase/config';

const formSchema = z.object({
    DocName: z.string().min(2),
    ExpireAt: z.string().date().optional(),
    RemindAt: z.string().date().optional(),
})

const AddNewDocumentDialog = ({ trigger, staffid }: { trigger: React.ReactNode, staffid: string }) => {
    const [loading, setLoading] = useState(false)
    const { mutateAsync: addNewDocument, isPending: addingNewDocument } = useAddNewStaffDocument();
    const [file, setFile] = useState<File | null>(null);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            DocName: "",
            ExpireAt: "",
            RemindAt: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const documentRef = ref(storage, `user-docs/${staffid}/${Date.now() + "_" + values.DocName}`);
        try {
            await uploadBytes(documentRef, file as any);
            const docUrl = await getDownloadURL(documentRef);
            const formData = new FormData();
            formData.append("DocName", values.DocName);
            formData.append("ExpireAt", values.ExpireAt || '');
            formData.append("RemindAt", values.RemindAt || '');
            formData.append("Document", docUrl);
            formData.append("staffid", staffid);
            const response = await addNewDocument({ formData });
            if (response?.existing) {
                await deleteObject(documentRef);
                return toast.error("The Document with same name already exists.");
            } else if (response?._id) { return toast.success("Document added successfully.") }
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong on adding new document.")
        } finally {
            setLoading(false);
        }
    }

    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]?.size > 500 * 1024) {
            setFile(null);
            return toast.error("File size exceeds 500KB.", { description: "Please select a smaller sized Document." });
        } else {
            setFile(e.target.files ? e.target.files[0] : null);
        }
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Document</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="DocName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter document name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ExpireAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Expire At</FormLabel>
                                    <FormControl>
                                        <Input type='date' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="RemindAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remind Me At</FormLabel>
                                    <FormControl>
                                        <Input type='date' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Input type="file" placeholder='select your document' onChange={(e) => handleFileSelection(e)} />
                        {file && <Button disabled={loading} type="submit">{loading ? 'Adding...' : 'Submit'}</Button>}
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddNewDocumentDialog