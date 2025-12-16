"use client"
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signOut } from 'next-auth/react'
import { ConfigProvider, Popconfirm, Tooltip } from 'antd'
import { useResetPassword } from '@/query/client/userQueries'
import { toast } from 'sonner'

const formSchema = z.object({
    currentPass: z.string().min(6, "minimum 6 charecters required"),
    newPass: z.string().min(6, "minimum 6 charecters required").max(20, { message: "Shorten your password to within 20 characters to make it easier to remember" }),
    confirmPass: z.string().min(6, "minimum 6 charecters required").max(20, { message: "Shorten your password to within 20 characters to make it easier to remember" }),
}).refine(data => data.newPass === data.confirmPass, {
    message: "Passwords must match",
    path: ["cpassword"]
});

const ResetPasswordDialog = ({ trigger }: { trigger: React.ReactNode }) => {
    const { mutateAsync: resetUserPass, isPending: resettingPassword } = useResetPassword();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            currentPass: "",
            newPass: "",
            confirmPass: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('currentPass', values.currentPass);
        formData.append('newPass', values.newPass);
        const response = await resetUserPass(formData);
        if(response?.mismatch){
            return toast.error("Mistmatch in provided credentials.", { description: "Check again your current password and signout for the forget password option."});
        }else if(response?._id){
            signOut();
            return toast.success("Successfully updated your current password.")
        }
        return toast.error("Unexpected error occured.")
    }

    return (
        <Dialog>
            <DialogTrigger className='w-full'>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reset Your Password</DialogTitle>
                    <DialogDescription>change your current password or add a new one if you forget current one.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPass"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your current password." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newPass"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter your new password." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPass"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input placeholder="enter again." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-between items-center">
                            <Tooltip title="You have to Signout of application and click on forget password in the login screen." color='red'><h3 className='text-sm text-blue-700 font-medium italic underline cursor-pointer leading-3'>forget password?</h3></Tooltip>
                            <Button type="submit">{resettingPassword ? "Updating..." : "Update"}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    )
}

export default ResetPasswordDialog