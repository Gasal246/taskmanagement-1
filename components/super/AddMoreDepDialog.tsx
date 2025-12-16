"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Ban, CircleCheckBig } from 'lucide-react'
import { useAddMoreDep, useGetDemoDepartments } from '@/query/client/superuserQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    depid: z.string(),
})
const AddMoreDepDialog = ({ trigger, adminId }: { trigger: React.ReactNode, adminId: string }) => {
    const { data: demodepartments, isLoading: demoDeparmentsLoading } = useGetDemoDepartments();
    const { mutateAsync: addMoreDep, isPending: addingDepartment } = useAddMoreDep();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            depid: ''
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formdata = new FormData();
        formdata.append('adminId', adminId);
        formdata.append('depId', values.depid);
        const response = await addMoreDep(formdata);
        if(response?._id){
            return toast.success("Department Successfully Added.")
        }else{
            return toast.error("Department Not Added", { description: "please make sure you didn't have a department with same name."})
        }
    }

    return (
        <Dialog>
            <DialogTrigger className='w-full h-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add More Department.</DialogTitle>
                    <DialogDescription>Select the available department modals from dropdown list</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="depid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Modals</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl className='h-[130px]'>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a department plan" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                demodepartments?.map((dep: any) => (
                                                    <SelectItem value={dep?._id} key={dep?._id}>
                                                        <div className="w-full p-2">
                                                            <h1 className='text-sm font-medium mb-1'>{dep?.DepartmentName}</h1>
                                                            <div className='space-y-[3px]'>
                                                                <li className="text-xs flex items-center gap-1">{dep?.AllowProjects ? <><CircleCheckBig size={14} /> Project Adding Allowed</> : <><Ban size={14} /> Project Adding Not Allowed</>}</li>
                                                                <li className="text-xs flex items-center gap-1">{dep?.AllowTasks ? <><CircleCheckBig size={14} /> Task Adding Allowed</> : <><Ban size={14} /> Task Adding Not Allowed</>}</li>
                                                                <li className="text-xs flex items-center gap-1">Maximum Staffs Allowed: {dep?.MaximumStaffs}</li>
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
                        <Button type="submit">{addingDepartment ? "Creating.." : "Create One"}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddMoreDepDialog