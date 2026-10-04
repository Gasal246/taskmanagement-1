"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod";
import { useRouter } from 'next/navigation';
import React from 'react'
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useSetupUserPassword } from "@/query/user/queries";

const formSchema = z.object({
  password: z.string()
    .min(8, { message: "Use at least 8 characters" })
    .max(64, { message: "Use at most 64 characters" }),
  cpassword: z.string()
    .min(8, { message: "Use at least 8 characters" })
    .max(64, { message: "Use at most 64 characters" })
})
.refine(data => data.password === data.cpassword, {
  message: "Passwords must match",
  path: ["cpassword"]
});

const ResetPassword = ({ params }: { params: Promise<{ email: string, pin: string }> }) => {
  const { email: encodedEmail, pin } = React.use(params);
  const email = decodeURIComponent(encodedEmail) || '';
  const router = useRouter()
  const { mutateAsync: setupNewPassword, isPending: settingupPassword } = useSetupUserPassword();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      cpassword: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if(values.password !== values.cpassword){
      return toast.error("passwords are not matching!!")
    }
    try {
      const response = await setupNewPassword({ email, password: values.password, token: pin });
      if (!response?.status) throw new Error(response?.message || "Password reset failed");
      toast.success("Password updated. Sign in with your new password.");
      router.replace('/signin');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to reset password");
    }
  }

  return (
    <div className='w-full h-screen overflow-hidden justify-center items-center flex flex-col p-4'>
      <h1 className='font-bold text-xl'>TaskManager Setup Password</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full lg:w-1/2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input autoComplete="new-password" type="password" placeholder="enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cpassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input autoComplete="new-password" type="password" placeholder="enter your password again" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={settingupPassword}>{ settingupPassword ? 'Setting Up..' : 'Confirm'}</Button>
        </form>
      </Form>
    </div>
  )
}

export default ResetPassword
