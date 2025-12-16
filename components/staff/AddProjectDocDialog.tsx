"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from '../ui/input'
import { Avatar, Tooltip } from 'antd'
import { toast } from 'sonner'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/firebase/config'
import { useAddProjectDocument } from '@/query/client/projectQueries'

const formSchema = z.object({
    DocName: z.string().min(2),
    Private: z.boolean(),
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "You have to select at least one item.",
    }),
})

interface User {
    _id: string;
    Name: string;
    Email: string;
    AvatarUrl: string;
    Department?: {
        DepartmentName: string;
    }
}

const AddProjectDocDialog = ({ trigger, projectId, users, creatorid, adminid, docnames }: { trigger: React.ReactNode, projectId: string, users: User[], creatorid: string, adminid: string, docnames: string[] }) => {
    const [file, setFile] = useState<File | null>(null);
    const [docnameExist, setDocnameExist] = useState(false);
    const [loading, setLoading] = useState(false);
    const { mutateAsync: addProjectDocument, isPending: addingProjectDoc } = useAddProjectDocument();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            DocName: "",
            Private: true,
            items: [creatorid, adminid]
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if(docnameExist){
            return toast.error("Document with same name exist!", { description: "Consider changing name of new doc, or delete existing one."})
        }
        setLoading(true);
        const documentRef = ref(storage, `project-docs/${projectId}/${Date.now() + "_" + values.DocName}`);
        try {
            await uploadBytes(documentRef, file as any);
            const docUrl = await getDownloadURL(documentRef);
            const formData = new FormData();
            formData.append('projectid', projectId);
            formData.append('docname', values.DocName); 
            formData.append('accessto', values.items?.join(',')); 
            formData.append('docurl', docUrl);
            const response = await addProjectDocument(formData);
            if(response?._id){
                return toast.success("Document Added Successfully");
            }else{
                return toast.error("Document Adding Failed!!");
            }
        } catch (error) {
            console.log(error);
            toast.error("Something went wrong on adding document.")
        } finally {
            setLoading(false)
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

    const handleDocNameInput = (e: any) => {
        const value = e.target.value;
        form.setValue('DocName', value, { shouldValidate: true });
        if(docnames.includes(value)){
            setDocnameExist(true);
        }else{
            setDocnameExist(false);
        }
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a Project Document.</DialogTitle>
                    <DialogDescription>Adding a project document ?</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="DocName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="your document name." {...field} onChange={(e: any) => {field.onChange(e); handleDocNameInput(e)}} />
                                    </FormControl>
                                    <FormDescription className='text-red-600'>{docnameExist && 'docname already exist! please use another name.'}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="Private"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className={`text-base ${form.getValues('Private') === false && 'text-slate-400'}`}> {form.getValues('Private') ? 'Private File' : 'Public File.'} </FormLabel>
                                        {users?.length > 2 ? <FormDescription className={`${form.getValues('Private') === false && 'text-orange-400'}`}> {form.getValues('Private') ? 'Switching to private file will make this document only view to you & company.' : 'you are making the document public to selected people, so that they could aslo access these files.'} </FormDescription> : 
                                        <FormDescription>The Project is Only Accessible to Creator & Admin at the moment, so files should be always private</FormDescription>}
                                    </div>
                                    {users?.length > 2 &&
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            {/* Disable the switching option for the staffs and all the documents added by staff is default added as private document. */}
                                        </FormControl>}
                                </FormItem>
                            )}
                        />
                        {
                            form?.getValues('Private') === false && users?.length > 2 &&
                            <FormField
                                control={form.control}
                                name="items"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-1">
                                            <FormLabel className="text-base">Give Access</FormLabel>
                                            <FormDescription>Select the people who could access this documents, You can change it later.</FormDescription>
                                        </div>
                                        <div className="h-[200px] overflow-y-scroll">
                                            {users.map((user) => (
                                                user?._id != creatorid && user?._id != adminid &&
                                                <FormField
                                                    key={user._id}
                                                    control={form.control}
                                                    name="items"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem key={user?._id} className="flex flex-row items-center space-x-3 space-y-1">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(user?._id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, user?._id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== user?._id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    <div className="flex gap-1 items-center">
                                                                        <Avatar src={user?.AvatarUrl || '/avatar.png'} size={24} />
                                                                        <div>
                                                                            <h3 className='text-neutral-200 text-xs leading-3 font-medium'>{user?.Name}</h3>
                                                                            <h3 className='text-neutral-300 text-xs '>{user?.Email}</h3>
                                                                        </div>
                                                                        <Tooltip title="Department this staff belong"><h1 className='text-xs text-slate-300 px-4'>{user?.Department?.DepartmentName}</h1></Tooltip>
                                                                    </div>
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }
                        <div>
                            <Input type='file' placeholder="your document name." onChange={handleFileSelection} />
                        </div>
                        <Button type="submit">{loading ? 'Adding..' : 'Add New'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default AddProjectDocDialog