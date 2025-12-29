/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect, useState } from 'react'
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
import { Loader2 } from 'lucide-react';
import { useGetEqCountries, useGetEqRegions } from '@/query/enquirymanager/queries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Email is required" }),
  phone: z.string().min(8, { message: "Phone is required" }).max(12, { message: "Not a valid phone number" }),
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  contract_no: z.string().optional(),
  contract_expiry: z.string().optional(),
  country_id: z.string(),
  region_id: z.string(),
  business_id: z.string()
})

const AddAgentPage = () => {
  const router = useRouter();
  const [country, setCountry] = useState([]);
  const { businessData } = useSelector((state: RootState) => state.user);

  const { mutateAsync: AddAgent, isPending } = useAddNewAgent();
  const { mutateAsync: GetCountries } = useGetEqCountries();


  const fetchCountries = async () => {
    const res = await GetCountries();
    console.log("countries", res?.countries);

    if (res?.status == 200) setCountry(res?.countries);
  }

  useEffect(() => {
    fetchCountries();
  }, []);

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
      contract_no: "",
      country_id: "",
      region_id: "",
      business_id: businessData?._id
    },
  });

  const country_id = form.watch("country_id");
  const { data: regions } = useGetEqRegions(country_id);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await AddAgent(values);

    if (res?.status == 201) {
      toast.success(res?.message || "Agent Added");
      const agentId = res?.agent?._id || res?.agentId;
      if (agentId) {
        router.push(`/admin/enquiries/agents/${agentId}/docs`);
      }
      return;
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
            <div className="w-full lg:w-1/2 p-1 lg:pt-2 space-y-4">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1">Agent Details</h1>

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
            <div className="w-full lg:w-1/2 space-y-4">
              <h1 className="font-semibold text-xs text-slate-300 flex items-center gap-1 pt-4 lg:pt-0">Agent Address</h1>

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

              <FormField control={form.control} name="contract_no" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Contract Number</FormLabel>
                  <FormControl className="border-slate-600 w-[95%]"><Input placeholder="Contract No." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="contract_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Contract Expiry
                    </FormLabel>

                    <FormControl className="border-slate-600 w-[95%]">
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="country_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Country
                    </FormLabel>

                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200 w-[95%]">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {country.map((c: any) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.country_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Region
                    </FormLabel>

                    <Select
                      disabled={!form.watch("country_id")}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-900/50 text-slate-200 w-[95%]">
                          <SelectValue placeholder="Region" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {regions?.region?.map((r: any) => (
                          <SelectItem key={r._id} value={r._id}>
                            {r.region_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-5 px-5">
              <Tooltip title="Save agent with these details">
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                  disabled={isPending}
                  className='bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2'>
                  {isPending && <Loader2 size={16} className="animate-spin" />}
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
