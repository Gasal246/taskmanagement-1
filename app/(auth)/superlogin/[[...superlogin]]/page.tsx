"use client"

import React, { useEffect, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ThemeChanger } from '@/components/theme/ThemeChanger'

const formSchema = z.object({
    email: z.string().min(2).max(50),
    password: z.string().min(6, "minimum charecters length not satisfied.")
})

const SuperLogin = () => {
    const [loading, setLoading] = useState(false)
    const session = useSession()
    const router = useRouter()

    useEffect(() => {
        if (session?.status == 'authenticated') {
            router.replace('/superadmin')
        }
    }, [session, router])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const response = await signIn('credentials', {
                redirect: false,
                email: values.email,
                password: values.password,
                isSuper: 'true'
            })
            if (response?.error) {
                toast("Login Failed!", {
                    description: "There is a mismatch in provided credentials."
                })
            }
            if (response?.ok) {
                toast("Login Success..", {
                    description: "Good to see you " + values.email
                })
            }
        } catch (error) {
            console.log(error)
        } finally {
            form.reset()
            setLoading(false)
        }
    }

    return (
        <div className='w-full h-screen flex flex-col items-center justify-center p-4 gap-10'>
            <div className="absolute top-10 flex justify-between items-center w-full px-10">
                <h1 className='font-bold'>Task Manager</h1>
                <ThemeChanger />
            </div>
            <h1 className='font-black text-3xl'>Super Login.</h1>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:w-1/3 w-full mb-32 md:mb-0">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="enter your Email" {...field} className='bg-transparent outline-none border border-slate-700' />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="enter your Password" type='password' {...field} className='bg-transparent outline-none border border-slate-700' />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-between items-center">
                        <Link href={`/forgetpassword`} className='text-blue-600 text-sm'>
                            forgot credentials ?
                        </Link>
                        <Button type="submit">{ loading ? <Image src={`/icons/loadingspin.svg`} width={30} height={30} alt='loader' /> : 'Login now'}</Button>
                    </div>
                </form>
            </Form>
            <div className='md:w-2/3 w-full absolute bottom-5 md:bottom-10 p-2'>
                <p className='text-sm text-gray-500 text-center'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Labore eius reprehenderit laborum ipsam quis rem est quod eligendi accusamus facilis, non aspernatur voluptatem excepturi obcaecati, reiciendis, tenetur eveniet. Nisi ut doloremque atque aspernatur quos quaerat laboriosam, velit repellendus quis molestiae quam perspiciatis officiis iusto harum, praesentium molestias eum cum nobis!</p>
            </div>
        </div>
    )
}

export default SuperLogin
