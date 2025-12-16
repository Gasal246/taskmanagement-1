"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import { useChangeProjectDeadline } from '@/query/client/projectQueries'
import { toast } from 'sonner'

const FormSchema = z.object({
  deadline: z.date(),
})

const ChangeDeadlineDialog = ({ trigger, projectid, deadline }: { trigger: React.ReactNode, deadline: string, projectid: string }) => {

  const { mutateAsync: changeDeadline, isPending: changingDeadline } = useChangeProjectDeadline();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      deadline: new Date(deadline),
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const res = await changeDeadline({ projectid, deadiline: data?.deadline.toISOString() });
    if(res?._id){
      return toast.success("Deadline Changed");
    }else{
      return toast.error("Deadline Not Changed!!.")
    }
  }

  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Deadline</DialogTitle>
          <DialogDescription>Days could be Added and Reduced from your current Deadline</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground" )} >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : ( <span>Pick a date</span> )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          const thirtyDaysBefore = new Date(today);
                          thirtyDaysBefore.setDate(today.getDate() - 30);
                        
                          const thirtyDaysAfter = new Date(today);
                          thirtyDaysAfter.setDate(today.getDate() + 30);
                        
                          return date < thirtyDaysBefore || date > thirtyDaysAfter;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                  <FormDescription>You could only select date includes in past 30 days or upcoming 30 days.</FormDescription>
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

  )
}

export default ChangeDeadlineDialog

