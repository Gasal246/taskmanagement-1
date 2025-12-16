/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { UserPlus } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Tooltip } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { useAddBusinessStaff } from '@/query/user/queries';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { loadAdminBusinessStaff } from '@/redux/slices/application';

const formSchema = z.object({
    name: z.string().min(2, { message: "name must be at least 2 characters." }),
    email: z.string().email({ message: "email is required" }),
    phone: z.string().min(8, { message: "phone is required" }).max(12, { message: "not a valid phone number" }),
    country: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
})

const AddStaff = () => {
    const { businessData } = useSelector((state: RootState) => state.user);
    const { mutateAsync: addBusinessStaff, isPending: addingBusinessStaff } = useAddBusinessStaff();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            country: "",
            province: "",
            city: "",
            dob: "",
            gender: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append('body', JSON.stringify({
            name: values.name,
            email: values.email,
            phone: values.phone,
            country: values.country,
            province: values.province,
            city: values.city,
            dob: values.dob,
            gender: values.gender,
            business_id: businessData?._id
        }));
        const response = await addBusinessStaff(formData);
        if(response?.status == 400){
            toast.error("User already exists");
        }else{
            toast.success("Staff added successfully");
            dispatch(loadAdminBusinessStaff(response?.data));
            router.push("/admin/staffs/add-staff/details");
            return;
        }
    }

    return (

        <div className='p-5 pb-10'>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>manage staff</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>add staff</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg mt-2">
                <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1"><UserPlus size={16} /> Add Business Staff</h1>
            </div>
            <div className="mt-2 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg pb-10">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex flex-wrap">
                        <div className="w-full lg:w-1/2 p-1 lg:pt-2">
                            <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">User Details</h1>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Name</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user name" {...field} />
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
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Email</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Phone</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user phone" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dob"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Date of Birth</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user dob" type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Gender</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user gender" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="w-full lg:w-1/2">
                            <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 pt-4 lg:pt-0">User Address</h1>
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Country</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user country" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="province"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Province</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user province" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-slate-300 font-semibold">City</FormLabel>
                                        <FormControl className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[95%]">
                                            <Input placeholder="user city" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="pt-5 px-5">
                            <Tooltip placement='right' title="this will create a business staff and continue to add staff details"><motion.button 
                             type="submit"
                             whileTap={{ scale: 0.98 }} 
                             whileHover={{ scale: 1.02 }} 
                             className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold'>
                                Save & Continue
                            </motion.button></Tooltip>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    )
}

export default AddStaff