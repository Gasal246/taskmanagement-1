"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { useAddDepartmentHead, useGetAllStaffs } from '@/query/client/adminQueries'
import { useSession } from 'next-auth/react'
import { Avatar } from 'antd'
import { toast } from 'sonner'

const formSchema = z.object({
    staffid: z.string().min(2),
})

const AddDepartmentHead = ({ trigger, departmentId }: { trigger: React.ReactNode, departmentId: string }) => {
    const { data: session }: any = useSession();
    const { data: staffs, isLoading: staffsLoading } = useGetAllStaffs(session?.user?.id);
    const { mutateAsync: addDepartmentHead, isPending: addingDepartmentHead } = useAddDepartmentHead();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            staffid: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await addDepartmentHead({ depid: departmentId, staffid: values.staffid });
        if(response?._id){
            return toast.success("Department Head Successfully Added.");
        }
        return toast.error("Failed to add Department Head.")
    }

    return (
        <Dialog>
            <DialogTrigger>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="staffid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Staffs</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a staff as head of department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                staffs?.map((staff: any) => (
                                                    <SelectItem key={staff?._id} value={staff?._id}>
                                                        <div className="flex gap-1">
                                                            <Avatar src={staff?.AvatarUrl ? staff?.AvatarUrl : '/avatar.png'} />
                                                            <div>
                                                                <h1 className='text-xs leading-4'>{staff?.Name}</h1>
                                                                <h1 className='text-xs'>{staff?.Email }</h1>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{addingDepartmentHead ? "Updating.." : 'Update'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddDepartmentHead
