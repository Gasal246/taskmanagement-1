"use client";

import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqProvince, useAddNewEqArea } from "@/query/enquirymanager/queries";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

export default function AddAreaPage() {
    const router = useRouter();
  const [countries, setCountries] = useState([]);
  const form = useForm({
    defaultValues: {
      country: "",
      region: "",
      province: "",
      city: "",
      area_name: ""
    }
  });

  const fetchCountries = async() => {
    const res = await getCountries();
    if(res.status == 200){
      setCountries(res?.countries);
    }
  }

  useEffect(()=> {
    fetchCountries();
  },[]);

  const country_id = form.watch("country");
  const region_id = form.watch("region");
  const province_id = form.watch("province");

  const { mutateAsync: getCountries } = useGetEqCountries();
  const {mutateAsync: AddArea, isPending: isAddingArea} = useAddNewEqArea();
  const { data: regions } = useGetEqRegions(country_id);
  const { data: provinces } = useGetEqProvince(region_id);
  const { data: cities } = useGetEqCities(province_id);

  const onSubmit = async (values: any) => {
    const res = await AddArea(values);
    if(res.status == 201){
      toast.success(res?.message || "Area Added");
    } else {
      toast.error(res?.message || "Failed to add area")
    }
  };

  return (
    <div className="p-5 pb-10">
      {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Manage Areas</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Add Area</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
    
    <div className="mx-auto max-w-md p-5">
      
      <h1 className="text-base font-semibold mb-4 text-slate-200">
        Add New Area
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* COUNTRY */}
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-300 text-sm">Country</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries?.map((c:any) => (
                    <SelectItem key={c._id} value={c._id}>{c.country_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* REGION */}
          <FormField control={form.control} name="region" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-300 text-sm">Region</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={!country_id}>
                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {regions?.region?.map((r:any) => (
                    <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {/* PROVINCE */}
          <FormField control={form.control} name="province" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-300 text-sm">Province</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={!region_id}>
                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                  <SelectValue placeholder="Select Province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces?.provinces?.map((p:any) => (
                    <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {/* CITY */}
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-300 text-sm">City</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={!province_id}>
                <SelectTrigger className="bg-slate-900/50 text-slate-200">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.cities?.map((c:any) => (
                    <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {/* AREA NAME */}
          <FormField control={form.control} name="area_name" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-300 text-sm">Area Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter area name" className="bg-slate-900/50 text-slate-200" {...field} />
              </FormControl>
            </FormItem>
          )} />

          <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-600">
            Save Area
          </Button>

        </form>
      </Form>
    </div>
    </div>
  );
}
