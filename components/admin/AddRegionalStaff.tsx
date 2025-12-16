"use client"
import React from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { useAddDepStaff, useAddRegionalStaff, useGetAvailableStaffs } from '@/query/client/depQueries'
import { useSession } from 'next-auth/react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Avatar } from 'antd'
import { toast } from 'sonner'


const formSchema = z.object({
    staffid: z.string(),
})

const AddRegionalStaff = ({ trigger, depId, regId }: { trigger: React.ReactNode, depId: string, regId: string }) => {
    const { data: session }: any = useSession();
    const { data: stafflist, isLoading: loadingStafflist } = useGetAvailableStaffs(session?.user?.id, ['staff', 'reg-staff']);
    const { mutateAsync: addDepStaff, isPending: addingDepStaff } = useAddRegionalStaff();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            staffid: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const response = await addDepStaff({ depid: depId, staffid: values.staffid, regid: regId });
        if(response?.overflow){
            return toast.error("Department Overflow", {
                description: "Looks like you have already added maximum number of staffs"
            })
        }else if(response?.existing){
            return toast.error("Staff already exist")
        }else if(response?._id){
            return toast.success("Successfully added a department staff.")
        }else{
            return toast.error("Something went wrong...")
        }
    }

    return (
        <Sheet>
            <SheetTrigger>{trigger}</SheetTrigger>
            <SheetContent className='min-w-full lg:min-w-[600px] border-slate-700'>
                <SheetHeader>
                    <SheetTitle>Add Regional Staffs</SheetTitle>
                    <SheetDescription>Select the staffs from available staffs list below.</SheetDescription>
                </SheetHeader>
                <div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
                            <FormField
                                control={form.control}
                                name="staffid"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Staffs</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl className='text-start h-[60px]'>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={`${stafflist?.length > 0 ? 'Select any staff' : 'No staffs available'}`} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {
                                                    stafflist?.map((staff: any) => (
                                                        <SelectItem value={staff?._id} key={staff?._id}>
                                                            <div className="flex gap-1 items-center">
                                                                <Avatar src={staff?.AvatarUrl || '/avatar.png'} />
                                                                <div>
                                                                    <h2 className='text-sm font-medium leading-3'>{staff?.Name}</h2>
                                                                    <h2 className='text-xs'>{staff?.Email}</h2>
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
                            <Button type="submit">{'Add Staff'}</Button>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>

    )
}

export default AddRegionalStaff