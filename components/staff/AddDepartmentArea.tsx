"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { motion } from 'framer-motion'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

const FormSchema = z.object({
    areaid: z.string(),
})

const AddDepartmentArea = ({ currentUser, allAreas }:{ currentUser: any, allAreas: any[] }) => {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    })

    function onSubmit(data: z.infer<typeof FormSchema>) {
        console.log(data.areaid)
    }
    return (
        <Dialog>
            <DialogTrigger asChild><motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><Button className='rounded-full'>Add Area</Button></motion.div></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Area to Add</DialogTitle>
                    <DialogDescription>You could see all non assigned areas of the region here..</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
                        <FormField
                            control={form.control}
                            name="areaid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Area List</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                {/* <SelectValue placeholder={"Select a region from this list" || "You have no Unselected regions to list"} /> */}
                                                <SelectValue placeholder={"Select an area from this list"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="m@example.com">m@example.com</SelectItem>
                                            <SelectItem value="m@google.com">m@google.com</SelectItem>
                                            <SelectItem value="m@support.com">m@support.com</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
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

export default AddDepartmentArea