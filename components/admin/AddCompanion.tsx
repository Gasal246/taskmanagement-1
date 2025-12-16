"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Button } from "../ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAddNewCompanion } from "@/query/client/adminQueries"
import { toast } from "sonner"

const formSchema = z.object({
    name: z.string().min(2),
    email: z.string().email()
})

const AddCompanion = ({ trigger, currentUser }: { trigger?: React.ReactNode, currentUser: any }) => {
    const { mutateAsync: addCompanion, isPending: addingCompanion } = useAddNewCompanion()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('conpanionform', JSON.stringify({
            Name: values.name,
            Email: values.email,
            AdminId: currentUser?._id
        }))
        try {
            const response = await addCompanion(formData);
            if(response?._id) {
                return toast.success("Companion Successfully Added.")
            }else{
                throw new Error(response)
            }
        } catch (error) {
            return toast.error("Something went wrong", { description: error as string })
        }
    }

    return (
        <Dialog>
            <DialogTrigger className="w-full" asChild>{trigger || <Button>Add More</Button>}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogDescription>Companion Profile allows you to pick profiles for each project and task creation.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Companion Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Name of companion" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Companion Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Email of companion" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Add Now</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default AddCompanion
