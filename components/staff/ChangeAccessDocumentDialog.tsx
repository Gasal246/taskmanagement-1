"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar } from 'antd'
import { useSession } from 'next-auth/react'
import { useDocumentChangeAccess } from '@/query/client/projectQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    Private: z.boolean(),
    userids: z.array(z.string()).refine((value) => value.some((item) => item), {message: "You have to select at least one other user.", }),
})

const ChangeAccessDocumentDialog = ({ trigger, projectid, doc, creatorid, adminid }: { trigger: React.ReactNode, projectid: string, doc:any, creatorid: string, adminid: string }) => {
    const { data: session }:any = useSession();
    const { mutateAsync: changeAccess, isPending: changingAccess } = useDocumentChangeAccess();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            Private: doc?.AccessTo?.length == 2 && doc?.AccessTo?.includes(adminid),
            userids: doc?.AccessTo?.map((x: any) => x._id)
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('projectid', projectid);
        formData.append('docid', doc?._id);
        formData.append('accessArray', values.userids?.join(','));
        const response = await changeAccess(formData);
        if(response?._id){
            return toast.success("Document Access Changed!!")
        }else{
            return toast.error("Something went wrong on changing access!!")
        }
    }

    return (
        <Dialog>
            <DialogTrigger className='w-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Your Document Access.</DialogTitle>
                    <DialogDescription>Update the accessability of this document for the project viewers.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <h1 className='text-base font-medium text-slate-400'>doc: {doc?.DocName}</h1>
                        <FormField
                            control={form.control}
                            name="Private"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className={`text-base ${form.getValues('Private') === false && 'text-slate-400'}`}> Private File </FormLabel>
                                        <FormDescription className={`${form.getValues('Private') === false && 'text-orange-400'}`}> Switching to private file will make this document only view to owner & company. </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {
                            form?.getValues('Private') === false &&
                            <FormField
                                control={form.control}
                                name="userids"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2">
                                            <FormLabel className="text-base">File Access</FormLabel>
                                            <FormDescription>Select the accessible users who could see this document</FormDescription>
                                        </div>
                                        {doc?.AccessTo?.map((user: any) => (
                                            <FormField
                                                key={user?._id}
                                                control={form.control}
                                                name="userids"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem key={user?._id} className="flex flex-row items-center space-x-2 space-y-0">
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
                                                                    disabled={session?.user?.id == creatorid || session?.user?.id == adminid}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                                <div className="flex gap-1 items-center p-2 rounded-lg bg-slate-950/50">
                                                                    <Avatar src={user?.AvatarUrl || '/avatar.png'} />
                                                                    <div>
                                                                        <h1 className='text-xs leading-3 font-medium'>{user?.Name}</h1>
                                                                        <h1 className='text-xs'>{user?.Email}</h1>
                                                                    </div>
                                                                </div>
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }
                        <Button type="submit" disabled={changingAccess}>{changingAccess ? 'Updating..' : 'Confirm'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default ChangeAccessDocumentDialog