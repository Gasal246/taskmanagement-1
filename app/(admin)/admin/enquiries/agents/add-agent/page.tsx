/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { UserPlus } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { useAddNewAgent } from '@/query/user/queries';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Email is required" }),
  phone: z.string().min(8, { message: "Phone is required" }).max(12, { message: "Not a valid phone number" }),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  business_id: z.string()
})

const AddAgentPage = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);

  const {mutateAsync: AddAgent, isPending} = useAddNewAgent();

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
      business_id: businessData?._id
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await AddAgent(values);

    if(res?.status == 201){
      return toast.success(res?.message || "Agent Added");
    } else {
      return toast.error(res?.message || "Failed to add agent");
    }
  }

  return (
    <div className='p-5 pb-10'>

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>manage agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>add agent</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg mt-2">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <UserPlus size={16} /> Add Agent
        </h1>
      </div>

      {/* Form */}
      <div className="mt-2 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-3 rounded-lg pb-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex flex-wrap">

            {/* LEFT SIDE */}
            <div className="w-full lg:w-1/2 p-1 lg:pt-2">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">User Details</h1>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Name</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Full Name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Email</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Phone</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Phone Number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Date of Birth</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Gender</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Gender" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </div>

            {/* RIGHT SIDE */}
            <div className="w-full lg:w-1/2">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 pt-4 lg:pt-0">User Address</h1>

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Country</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="province" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Province</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Province" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">City</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="City" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Submit Button */}
            <div className="pt-5 px-5">
              <Tooltip title="Save agent with these details">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold'>
                  Save & Continue
                </motion.button>
              </Tooltip>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default AddAgentPage;