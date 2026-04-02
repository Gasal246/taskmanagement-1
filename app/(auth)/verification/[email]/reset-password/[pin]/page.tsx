"use client"
/* eslint-disable react-hooks/exhaustive-deps */
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod";
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useSetupUserPassword, useVerifyUserOtp } from "@/query/user/queries";

const formSchema = z.object({
  password: z.string()
    .min(6, { message: "Password must have a minimum of 6 characters" })
    .max(20, { message: "Shorten your password to within 20 characters to make it easier to remember" }),
  cpassword: z.string()
    .min(6, { message: "Password must have a minimum of 6 characters" })
    .max(20, { message: "Shorten your password to within 20 characters to make it easier to remember" })
})
.refine(data => data.password === data.cpassword, {
  message: "Passwords must match",
  path: ["cpassword"]
});

const ResetPassword = ({ params }: { params: Promise<{ email: string, pin: string }> }) => {
  const { email: encodedEmail, pin } = React.use(params);
  const email = decodeURIComponent(encodedEmail) || '';
  const router = useRouter()
  const { mutateAsync: verifyOtp } = useVerifyUserOtp();
  const { mutateAsync: setupNewPassword, isPending: settingupPassword } = useSetupUserPassword();

  useEffect(() => {
    const fn = async () => {
      const res = await verifyOtp({ email, otp: pin });
      if (!res || !res?.status) {
        toast.error("Seems Like You Are into Something Huh??.")
        router.replace('/')
      }
    }
    fn()
  }, [])

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
    const response = await setupNewPassword({ email, password: values.password })
    if(!response){
      return toast.error("password setup failed", {
        description: "some unexpected error occured, please try again"
      })
    }
    toast.success("New Password Updated!", {
      description: `password updated ${email}`
    })
    return router.replace('/')
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
                  <Input type="password" placeholder="enter your password" {...field} />
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
                  <Input type="password" placeholder="enter your password again" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">{ settingupPassword ? 'Setting Up..' : 'Confirm'}</Button>
        </form>
      </Form>
    </div>
  )
}

export default ResetPassword
