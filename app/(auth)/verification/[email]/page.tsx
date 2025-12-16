/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "@/components/ui/input-otp"
import { toast } from 'sonner'
import { ShieldAlert, Timer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tooltip } from 'antd'
import SharedFooter from '@/components/shared/SharedFooter'
import { useGetUserByEmail, useSendEmailVerification, useVerifyUserOtp } from '@/query/user/queries'

const FormSchema = z.object({
    pin: z.string().min(6, {
        message: "Your one-time password must be 6 characters.",
    }),
})

const EmailVerificationPage = ({ params }: { params: { email: string } }) => {
    const email = decodeURIComponent(params?.email) || '';
    const { mutateAsync: findUserByEmail } = useGetUserByEmail();
    const { mutateAsync: sendEmailOtp, isPending: sendingEmail, status: emailSendStatus } = useSendEmailVerification();
    const { mutateAsync: verifyOtp, isPending: verifyingOTP, status: verificationStatus } = useVerifyUserOtp();
    const [userFound, setUserFound] = useState(false);
    const [timer, setTimer] = useState(120);
    const [isTimerActive, setIsTimerActive] = useState(true);
    const [isOTPFormVisible, setIsOTPFormVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fn = async () => {
            const res = await findUserByEmail(email);
            if (res?.status) {
                setUserFound(true)
            } else {
                setUserFound(false);
                toast.error("User Not Found!!");
                router.back();
            }
        }
        fn();
    }, [email])

    useEffect(() => {
        let timerInterval: NodeJS.Timeout;
        if (isTimerActive && timer > 0) {
            timerInterval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
        } else if (timer === 0) {
            setIsTimerActive(false);
            setIsOTPFormVisible(false)
        }
        return () => clearInterval(timerInterval);
    }, [timer, isTimerActive]);

    const handleSendOTP = async () => {
        const res = await sendEmailOtp(email);
        if(!res){
            return toast.error("Email Not Send!!")
        }
        toast.success("OTP Send successfully!", {
            description: email
        })
        setIsOTPFormVisible(true);
        setTimer(120)
        setIsTimerActive(true)
    };

    useEffect(() => {
        if(emailSendStatus === 'pending'){
            toast("Sending Email Verification OTP", {
                description: email
            })
        }
    }, [ emailSendStatus ])

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            pin: "",
        },
    })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const response = await verifyOtp({ email, otp: data.pin });
        if(response?.status){
            toast.success("OTP Verified successfully!", {
                description: email
            })
            router.replace(`/verification/${email}/reset-password/${form.getValues('pin')}`)
        }else{
            toast.error("OTP Verification Failed!!");
            setIsOTPFormVisible(false);
            setIsTimerActive(false);
            form.reset()
        }
    }

    useEffect(() => {
        if(verificationStatus === 'pending'){
            toast("Verifying OTP", {
                description: email
            })
        }
    }, [verificationStatus])

    return (
        <div className='w-full h-screen overflow-hidden p-5'>
            <div className="flex w-full justify-between">
                <h1 className='text-lg font-black'>TaskManager</h1>
                <h1 className='text-lg font-bold'>Email Verification</h1>
            </div>
            <div className="w-full h-full flex flex-col justify-center items-center">
                {
                    userFound ?
                        (
                            isOTPFormVisible ?
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="pin"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Verification</FormLabel>
                                                    <FormControl>
                                                        <InputOTP maxLength={6} {...field}>
                                                            <InputOTPGroup>
                                                                <InputOTPSlot index={0} />
                                                                <InputOTPSlot index={1} />
                                                                <InputOTPSlot index={2} />
                                                                <InputOTPSlot index={3} />
                                                                <InputOTPSlot index={4} />
                                                                <InputOTPSlot index={5} />
                                                            </InputOTPGroup>
                                                        </InputOTP>
                                                    </FormControl>
                                                    <FormDescription>
                                                        Please enter the OTP sent to <strong>{email}</strong>.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex justify-between items-center">
                                            <Button type="submit">{ verifyingOTP ? 'Verifying...' : 'Verify'}</Button>
                                            <h1 className='flex items-center gap-1'><Timer size={14} /><span className='font-bold flex items-center'>{Math.floor(timer / 60)} : {timer % 60 < 10 ? '0' : ''}{timer % 60}</span></h1>
                                        </div>
                                    </form>
                                </Form> :
                                <div className='flex flex-col items-center justify-center gap-3'>
                                    <h1>Email Verification {`{ "${email}" }`}</h1>
                                    <Tooltip title={`This will send a email to ${email} with a six digit OTP.`}>
                                        <Button onClick={handleSendOTP} type='button'>{sendingEmail ? 'Sending...' : 'Send OTP'}</Button>
                                    </Tooltip>
                                </div>
                        )
                        :
                        <div className="flex flex-col justify-center items-center gap-3">
                            <h1 className='flex gap-1 text-orange-400 font-bold'><ShieldAlert /> Cannot Find This Email Address: <strong>{email}</strong></h1>
                            <Button onClick={() => router.replace('/')}>Go Back</Button>
                        </div>
                }
                <div className="mt-10">
                    <SharedFooter />
                </div>
            </div>
        </div>
    )
}

export default EmailVerificationPage