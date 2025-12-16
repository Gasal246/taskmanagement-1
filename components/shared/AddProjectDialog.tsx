"use client"
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from '../ui/textarea'
import { ConfigProvider, DatePicker, DatePickerProps } from 'antd'
import { Flag } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useFindUserById } from '@/query/client/userQueries'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { useAddNewProject } from '@/query/client/projectQueries'
import { useGetAllDepartments } from '@/query/client/adminQueries'
import LoaderSpin from './LoaderSpin'
import { useGetAllClients } from '@/query/client/clientQueries'
import { Skeleton } from '../ui/skeleton'

const formSchema = z.object({
    title: z.string(),
    description: z.string().min(10, "Enter a brief note on project please"),
    depId: z.string().optional(),
    clientId: z.string().optional()
})
const AddProjectDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { data: session }: any = useSession();
    const { data: currentUser, isLoading: currentUserLoading } = useFindUserById(session?.user?.id);
    const { mutateAsync: addProject, isPending: addingProject } = useAddNewProject();
    const { data: departments, isLoading: loadingDepartments } = useGetAllDepartments(session?.user?.id);
    const { data: clients, isLoading: loadingClients } = useGetAllClients(session?.user?.id);
    const [deadline, setDeadline] = useState('');
    const [priority, setPriority] = useState('low');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            depId: "",
            clientId: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (currentUser?.Role == 'admin' && !values?.depId) {
            return toast.error("You should select a Department before continue.");
        }
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('description', values.description);
        formData.append('deadline', deadline);
        if(values.clientId !== 'none') formData.append('clientId', values?.clientId!);
        formData.append('depId', currentUser?.Role == 'admin' ? values.depId : currentUser?.Department?._id);
        formData.append('priority', priority);
        const response = await addProject(formData);
        if (response?._id) {
            return toast.success("Project is Queued.", { description: "Admin should approve the queued projects to start working on it." })
        }
    }

    const onChange: DatePickerProps['onChange'] = (date, dateString: any) => {
        setDeadline(dateString);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className='max-h-[90dvh] overflow-y-scroll'>
                <DialogHeader>
                    <DialogTitle>Add Project</DialogTitle>
                    <DialogDescription>Create the proposal of project and project can be distributed once approved by admin.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter the project title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div>
                            <label className='text-sm font-medium'>Dead line</label><br />
                            <ConfigProvider
                                theme={{
                                    token: { colorTextPlaceholder: '#1e1e1e', colorIcon: '#1e1e1e' },
                                }}>
                                <DatePicker onChange={onChange} className='w-full lg:w-1/2' placeholder='pickup the deadline' />
                            </ConfigProvider>
                        </div>
                        {(loadingClients || loadingDepartments) && <Skeleton className='w-full h-[50px] rounded-lg' />}
                        {clients && <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='flex gap-1 items-center'>Client Project {loadingDepartments && <LoaderSpin size={22} />}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={`select if project is not individual.`} />
                                            </SelectTrigger>
                                        </FormControl>
                                        {clients?.length > 0 && <SelectContent>
                                            <SelectItem value='none'>
                                                <div className="w-full p-1">
                                                    <h1 className='text-xs font-medium text-slate-300' >This is a individual Project</h1>
                                                    <h1 className='text-xs text-slate-400' >select this if this project have no client. (can be added later.)</h1>
                                                </div>
                                            </SelectItem>
                                            {clients?.map((client: any) => (
                                                <SelectItem key={client?._id} value={client?._id}>
                                                    <div className="w-full p-1">
                                                        <h1 className='text-xs font-medium text-slate-300' >{client?.Name}</h1>
                                                        <h1 className='text-xs text-slate-400' >{client?.Email}</h1>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>}
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />}
                        {
                            currentUser && currentUser?.Role === 'admin' &&
                            <FormField
                                control={form.control}
                                name="depId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='flex gap-1 items-center'>Department {loadingDepartments && <LoaderSpin size={22} />}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={`${departments?.length > 0 ? 'Select The Department From List' : 'You Have No Deparmtents'}`} />
                                                </SelectTrigger>
                                            </FormControl>
                                            {departments?.length > 0 && <SelectContent>
                                                {departments?.map((dep: any) => (
                                                    <SelectItem key={dep?._id} value={dep?._id}>{dep?.DepartmentName}</SelectItem>
                                                ))}
                                            </SelectContent>}
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }
                        <div>
                            <label className='text-sm font-medium'>Select Priority</label><br />
                            <div className="flex items-center gap-2">
                                <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'high' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('high')}>High <Flag size={18} fill='red' /></h1>
                                <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'average' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('average')}>Average <Flag size={18} fill='gold' /></h1>
                                <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'low' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('low')}>Low <Flag size={18} fill='silver' /></h1>
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Explain the project..." {...field} rows={6} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">{addingProject ? 'saving..' : 'Create'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default AddProjectDialog