"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useShowDepartmentForHeads } from '@/query/client/depQueries'
import { useSession } from 'next-auth/react'
import { Skeleton } from '../ui/skeleton'
import { Switch } from "@/components/ui/switch"
import { useCompleteOrForwardProject } from '@/query/client/projectQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    description: z.string().min(2),
    forwardDepId: z.string().optional()
})

const CompleteProjectDialog = ({ trigger, projectId, workingDep }: { trigger: React.ReactNode, projectId: string, workingDep: string }) => {
    const { data: session }: any = useSession();
    const [forwarding, setForwarding] = useState(true);
    const { data: departments, isLoading: loadingDepartments } = useShowDepartmentForHeads(session?.user?.id);
    const { mutateAsync: projectCompletion, isPending: loadingProjectCompletion } = useCompleteOrForwardProject();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            forwardDepId: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('projectid', projectId );
        formData.append('workingDepartment', workingDep);
        if(values.forwardDepId) formData.append('forwardDep', values.forwardDepId);
        formData.append('flowDescription', values.description);
        const response = await projectCompletion(formData);
        if(response?._id){
            return toast.success("Project Action Succsess")
        }else{
            return toast.error("Project Action Failed!!")
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark Work Completion</DialogTitle>
                    <DialogDescription>This will be recorded and showed in project flow as the department info for completing particular work.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Add Flow</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brief note on what you have done." className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className={`p-2 border rounded-lg w-full flex gap-2 items-center ${forwarding && 'bg-slate-800'}`}>
                            <Switch checked={forwarding} onCheckedChange={(value) => setForwarding(value)} />
                            <h1 className={`text-sm ${forwarding ? 'text-cyan-500' : 'text-slate-500'}`}>Forward This Project to Other Departments ?</h1>
                        </div>
                        {loadingDepartments ? <Skeleton className='w-full h-[40px]' /> : (forwarding &&
                            <FormField
                                control={form.control}
                                name="forwardDepId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Department To Forward</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a department to forward" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments?.map((dep: any) => (
                                                    <SelectItem value={dep?._id} key={dep?._id}>{dep?.DepartmentName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />)}
                        {form.getValues('description') && <div className="flex justify-end"><Button type="submit">{'Continue'}</Button></div>}
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default CompleteProjectDialog
