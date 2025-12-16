"use client"
import React, { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { Button } from '../ui/button'
import { CalendarIcon, Flag } from 'lucide-react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Textarea } from '../ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '@/lib/utils'
import { Calendar } from '../ui/calendar'
import { format } from "date-fns"
import { useEditTask } from '@/query/client/taskQueries'
import { toast } from 'sonner'
import LoaderSpin from '../shared/LoaderSpin'

const formSchema = z.object({
    description: z.string().min(2),
    duration: z.date(),
})

const EditTaskPriorityDurationSheet = ({ taskData, trigger }: { taskData: any, trigger: React.ReactNode }) => {
    const [priority, setPriority] = useState(taskData?.Priority);
    const { mutateAsync: taskupdate, isPending: updatingTask } = useEditTask()
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: taskData?.Description,
            duration: taskData?.Deadline,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('form', JSON.stringify({
            Description: values.description,
            Deadline: values.duration,
            Priority: priority
        }))
        const response = await taskupdate({ formData: formData });
        if(response?._Id){
            toast.success("Task Updated Successfully")
        }else{
            toast.error("Something went wrong", { description: `Error: ${response}`})
        }
    }
    return (
        <Sheet>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="w-[400px] lg:min-w-[660px]">
                <SheetHeader>
                    <SheetTitle>Edit Task</SheetTitle>
                    <SheetDescription>We Are In Beta Stage Of Developing Taskmanager, Kindly appologizing for serverside delays...</SheetDescription>
                </SheetHeader>
                <div className="h-full overflow-y-scroll pb-10 my-3">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className='text-sm font-medium'>Change Priority</label><br />
                                <div className="flex items-center gap-2">
                                    <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'high' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('high')}>High <Flag size={18} fill='red' /></h1>
                                    <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'medium' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('average')}>Average <Flag size={18} fill='gold' /></h1>
                                    <h1 className={`cursor-pointer text-sm font-medium hover:bg-cyan-950/50 border ${priority == 'low' && 'bg-cyan-950'} border-slate-500 p-1 px-3 flex gap-1 items-center rounded-lg`} onClick={() => setPriority('low')}>Low <Flag size={18} fill='silver' /></h1>
                                </div>
                            </div>
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Change Duration</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground" )} >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Change Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Tell What Exactly a user should do here.." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit">{updatingTask ? <LoaderSpin size={22} /> : 'Update'}</Button>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default EditTaskPriorityDurationSheet