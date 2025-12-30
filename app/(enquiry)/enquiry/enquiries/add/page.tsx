/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Building2, Plus, Trash2, Wifi, PhoneCall, LocateFixed } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddNewEnquiry, useGetEqAreas, useGetEqCampsByArea, useGetEqCities, useGetEqCountries, useGetEqProvince, useGetEqRegions } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { EQ_CAMP_TYPES, EQ_CAPACITY_LIMITS, Eq_CAPACITY_OPTIONS, EQ_CONTACT_AUTHORITY } from "@/lib/constants";
import LocationPicker from "@/components/enquiries/LocationPicker";


const priorityLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

/* =========== SCHEMA =========== */
const enquirySchema = z.object({
    country: z.string().min(1, "Select country"),
    region: z.string().min(1, "Select region"),
    province: z.string().optional(),
    city: z.string().optional(),

    area_input_mode: z.enum(["existing", "new"]).default("existing"),
    area: z.string().optional(),
    area_name_request: z.string().optional(),

    camp_input_mode: z.enum(["existing", "new"]).default("existing"),
    camp: z.string().optional(),
    camp_name_request: z.string().optional(),

    camp_type: z.string().optional(),
    client_company: z.string().optional(),
    landlord: z.string().optional(),
    real_estate: z.string().optional(),

    latitude: z.string(),
    longitude: z.string(),

    camp_capacity: z.string().optional(),
    camp_occupancy: z.string().optional(),

    contacts: z.array(z.object({
        name: z.string().min(1, "Contact name required"),
        phone: z.string().min(5, "Phone required"),
        email: z.string().optional(),
        designation: z.string().optional(),
        is_decision_maker: z.string().optional(),
        authority_level: z.string().optional(),
    })).optional(),

    wifi_available: z.enum(["Yes", "No"]),
    expected_monthly_price: z.string().optional(),
    other_wifi_details: z.string().optional(),
    wifi_type: z.string().optional(),
    contractor_name: z.string().optional(),
    contract_start: z.string().optional(),
    contract_expiry: z.string().optional(),
    wifi_plan: z.string().optional(),
    speed_mbps: z.string().optional(),
    service_quality: z.string().optional(),
    pain_points: z.string().optional(),

    provider_plan: z.string().optional(),
    personal_wifi_start: z.string().optional(),
    personal_wifi_expiry: z.string().optional(),
    personal_wifi_price: z.string().optional(),

    head_office_address: z.string().optional(),
    head_office_contact: z.string().optional(),
    head_office_location: z.string().optional(),
    head_office_details: z.string().optional(),

    lease_expiry_due: z.string().optional(),
    rent_terms: z.string().optional(),

    competition_status: z.string().optional(),
    competition_notes: z.string().optional(),

    priority: z.enum(priorityLevels as [string, ...string[]]).optional(),

    followup_status: z.enum(["Pending", "In Progress", "Closed"]),
    alert_date: z.string().optional(),
    next_action: z.string().optional(),
    next_action_due: z.string().optional(),

    images: z.any().optional(),

}).superRefine((values, ctx) => {
    const needsCampDetails = values.area_input_mode === "new" || values.camp_input_mode === "new";

    if (needsCampDetails && !values.camp_capacity) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["camp_capacity"],
            message: "Camp capacity is required for a new camp",
        });
    }

    if (needsCampDetails && !values.camp_occupancy) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["camp_occupancy"],
            message: "Camp occupancy is required for a new camp",
        });
    }

    if (values.camp_capacity && values.camp_occupancy) {
        const limit = EQ_CAPACITY_LIMITS[values.camp_capacity];
        const occupancy = Number(values.camp_occupancy);

        if (!Number.isNaN(occupancy) && limit && occupancy > limit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["camp_occupancy"],
                message: "Camp occupancy cannot exceed Camp Capacity",
            });
        }
    }
});

/* =========== COMPONENT =========== */
export default function AddEnquiry() {
  const [showHeadOffice, setShowHeadOffice] = useState(false);
  const [countries, setCountries] = useState([]);

  const { mutateAsync: GetCountries, isPending: isCountryLoading } = useGetEqCountries();
  const { mutateAsync: AddNewEnquiry, isPending: isEqAdding } = useAddNewEnquiry();

  const form = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      contacts: [{ name: "", phone: "", is_decision_maker: "No", authority_level: "Operational" }],
      country: "",
      region: "",
      province: "",
      city: "",
      area: "",
      camp: "",
      wifi_available: "No",
      followup_status: "Pending",
      area_input_mode: "existing",
      camp_input_mode: "existing",
      expected_monthly_price: "",
      other_wifi_details: "",
      latitude: "",
      longitude: ""
    }
  });

  const country_id = form.watch("country");
  const region_id = form.watch("region");
  const province_id = form.watch("province");
  const city_id = form.watch("city");
  const area_id = form.watch("area");

  const { data: regions, isLoading: isRegionLoading } = useGetEqRegions(country_id);
  const { data: provinces, isLoading: isProvinceLoading } = useGetEqProvince(region_id);
  const { data: cities, isLoading: isCityLoading } = useGetEqCities(province_id);
  const { data: areas, isLoading: isAreaLoading } = useGetEqAreas(city_id);
  const { data: camps, isLoading: isCampLoading } = useGetEqCampsByArea(area_id);


  const { control, handleSubmit } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });

  const fetchCountries = async () => {
    const res = await GetCountries();
    console.log("countries: ", res);

    if (res.status == 200) {
      setCountries(res.countries);
    }
  }

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    console.log("regions: ", regions);
  }, [regions]);

  const onSubmit = async (data: any) => {
    console.log("✅ FORM SUBMITTED:", data);
    const res = await AddNewEnquiry(data);
    if (res?.status == 201) {
      toast.success(res?.message || "Enquiry Added");
    } else {
      toast.error(res?.message || "Failed to create enquiry");
    }
  };

  return (
    <div className="p-5 pb-10">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/enquiry/enquiries">Enquiries</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Add Enquiry</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 p-3 rounded-lg mt-2">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <Building2 size={16} /> Add New Enquiry
        </h1>
      </div>

      <div className="mt-2 bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg pb-16">

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ------------------------------------ LOCATION ------------------------------------ */}
            <div className="flex flex-wrap gap-3">
              {/* COUNTRY */}
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Country</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={field.value ? "text-slate-200" : "text-slate-400"}>
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries?.map((country: any) => (
                          <SelectItem key={country._id} value={country._id}>{country.country_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />

              {/* REGION */}
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Region / Territory</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Region" /></SelectTrigger>
                      <SelectContent>
                        {regions?.region?.map((rg: any) => (
                          <SelectItem key={rg._id} value={rg._id}>{rg.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />

              {/* CITY + PROVINCE */}
              <FormField control={form.control} name="province" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Province</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Province" /></SelectTrigger>
                      <SelectContent>
                        {provinces?.provinces?.map((p: any) => (
                          <SelectItem key={p._id} value={p._id}>{p.province_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">City</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Province" /></SelectTrigger>
                      <SelectContent>
                        {cities?.cities?.map((c: any) => (
                          <SelectItem key={c._id} value={c._id}>{c.city_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />

              {/* AREA MODE */}
              <FormField control={form.control} name="area_input_mode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Area Selection</FormLabel>
                  <div className="flex gap-4 mt-1 text-sm">
                    <label><input type="radio" value="existing" checked={field.value === "existing"} onChange={() => form.setValue("area_input_mode", "existing")} /> Select Existing Area</label>
                    <label><input type="radio" value="new" checked={field.value === "new"} onChange={() => form.setValue("area_input_mode", "new")} /> Request New Area</label>
                  </div>
                </FormItem>
              )} />

              {form.watch("area_input_mode") === "existing" && (
                <FormField control={form.control} name="area" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Area</FormLabel>
                    <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select Area" /></SelectTrigger>
                        <SelectContent>
                          {areas?.areas?.map((a: any) => (
                            <SelectItem key={a._id} value={a._id}>{a.area_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )} />
              )}

              {form.watch("area_input_mode") === "new" && (
                <FormField control={form.control} name="area_name_request" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300">New Area Name</FormLabel>
                    <FormControl><Input placeholder="Enter area name to request" {...field} /></FormControl>
                  </FormItem>
                )} />
              )}

            </div>


            {/* CAMP INPUT MODE TOGGLE */}
            {form.watch("area_input_mode") == "existing" && (
              <FormField
                control={form.control}
                name="camp_input_mode"
                render={({ field }) => (
                  <FormItem className="mt-2 w-full">
                    <FormLabel className="text-xs text-slate-300 font-semibold">Camp Selection</FormLabel>

                    <div className="flex gap-4 mt-1 text-sm">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="existing"
                          checked={field.value === "existing"}
                          onChange={() => form.setValue("camp_input_mode", "existing")}
                        />
                        <span className="text-slate-300">Select Existing Camp</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="new"
                          checked={field.value === "new"}
                          onChange={() => form.setValue("camp_input_mode", "new")}
                        />
                        <span className="text-slate-300">Request New Camp</span>
                      </label>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* EXISTING CAMP SELECT */}
            {form.watch("camp_input_mode") === "existing" && form.watch("area_input_mode") == "existing" && (
              <FormField
                control={form.control}
                name="camp"
                render={({ field }) => (
                  <FormItem className="w-full mt-3">
                    <FormLabel className="text-xs text-slate-300 font-semibold">Camp Name</FormLabel>
                    <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={field.value ? "text-slate-200" : "text-slate-400"}>
                          <SelectValue placeholder="Select Camp Name" />
                        </SelectTrigger>
                        <SelectContent>
                          {camps?.camps?.map((c: any) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.camp_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* REQUEST NEW CAMP TEXT INPUT + LANDLORD/RE DETAILS/CLIENT */}
            {(form.watch("camp_input_mode") === "new" || form.watch("area_input_mode") == "new") && (
              <>
                <FormField
                  control={form.control}
                  name="camp_name_request"
                  render={({ field }) => (
                    <FormItem className="mt-3 w-full">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Requested Camp Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter camp name to request review" {...field} />
                      </FormControl>
                      <p className="text-[10px] text-slate-400 mt-1">
                        This will be reviewed and added to the system if valid.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CAMP TYPE */}
                <FormField
                  control={form.control}
                  name="camp_type"
                  render={({ field }) => (
                    <FormItem className="w-full lg:w-[48%]">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Camp Type</FormLabel>
                      <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="text-slate-200">
                            <SelectValue placeholder="Select Camp Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EQ_CAMP_TYPES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="landlord"
                  render={({ field }) => (
                    <FormItem className="w-full mt-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Landlord / Owner</FormLabel>
                      <FormControl><Input placeholder="Landlord / Owner Name" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="real_estate"
                  render={({ field }) => (
                    <FormItem className="w-full mt-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Real Estate Company</FormLabel>
                      <FormControl><Input placeholder="Real Estate Company Name" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_company"
                  render={({ field }) => (
                    <FormItem className="w-full mt-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Client / End-User Company</FormLabel>
                      <FormControl><Input placeholder="Client Company Name" {...field} /></FormControl>
                    </FormItem>
                  )}
                />


                {/* HEAD OFFICE */}
                {!showHeadOffice && (
                  <button type="button" className="text-cyan-400 text-xs underline" onClick={() => setShowHeadOffice(true)}>
                    + Add Head Office Details
                  </button>
                )}

                {showHeadOffice && (
                  <div className="border border-slate-700 p-3 rounded-lg space-y-3 bg-slate-900/50">
                    <div className="flex justify-between items-center">
                      <h1 className="text-xs font-semibold text-slate-300">Head Office</h1>
                      <button type="button" className="text-red-400 text-xs underline" onClick={() => setShowHeadOffice(false)}>
                        Remove
                      </button>
                    </div>

                    <FormField control={form.control} name="head_office_address" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-slate-300">Address</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />

                    <FormField control={form.control} name="head_office_contact" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-slate-300">Contact Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />

                    <FormField control={form.control} name="head_office_location" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-slate-300">Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />

                    <FormField control={form.control} name="head_office_details" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-slate-300">Other Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />

                  </div>
                )}

              </>
            )}

            {/* CAMP CAPACITY */}
                <FormField control={form.control} name="camp_capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300">Camp Capacity</FormLabel>
                    <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select Capacity" /></SelectTrigger>
                        <SelectContent>{Eq_CAPACITY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* OCCUPANCY */}
                <FormField control={form.control} name="camp_occupancy" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300">Current Occupancy</FormLabel>
                    <Input type="number" {...field} value={field.value || ""} />
                    <FormMessage />
                  </FormItem>
                )} />

            {/* CONTACTS */}
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <PhoneCall size={14} /> Contacts
            </div>

            {fields?.map((field, i) => (
              <div key={field.id} className="border border-slate-700 p-3 rounded-lg space-y-2">

                <div className="flex gap-3">
                  <Input {...form.register(`contacts.${i}.name`)} placeholder="Name" className="w-1/2" />
                  <Input {...form.register(`contacts.${i}.phone`)} placeholder="Phone" className="w-1/2" />
                </div>

                <Input {...form.register(`contacts.${i}.email`)} placeholder="Email (optional)" />
                <Input {...form.register(`contacts.${i}.designation`)} placeholder="Designation" />

                {/* Is Decision Maker? */}
                <div>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Is Decision Maker?</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select
                      value={form.watch(`contacts.${i}.is_decision_maker`)}
                      onValueChange={(val) => form.setValue(`contacts.${i}.is_decision_maker`, val)}
                    >
                      <SelectTrigger className="text-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Authority Level */}
                <div>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Authority Level</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select
                      value={form.watch(`contacts.${i}.authority_level`)}
                      onValueChange={(val) => form.setValue(`contacts.${i}.authority_level`, val)}
                    >
                      <SelectTrigger className="text-slate-200">
                        <SelectValue placeholder="Authority Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQ_CONTACT_AUTHORITY.map((c)=>(
                          <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-red-400 text-xs flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Remove Contact
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => append({ name: "", phone: "" })} className="text-cyan-400 text-xs flex items-center gap-1">
              <Plus size={14} /> Add Another Contact
            </button>

            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1"><LocateFixed size={14} /> Geo Location</div>

            <LocationPicker
              onChange={(loc:any)=> {
                form.setValue("latitude", loc.lat, { shouldValidate: true, shouldDirty: true });
                form.setValue("longitude", loc.lng, { shouldValidate: true, shouldDirty: true });
              }} />

              <Input type="text" {...form.register("latitude")} placeholder="Latitude" />
              <Input type="text" {...form.register("longitude")} placeholder="Longitude" />

            {/* WIFI */}
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1"><Wifi size={14} /> Wi-Fi / Internet</div>

            <FormField control={form.control} name="wifi_available" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Available?</FormLabel>
                <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select Wi-Fi Availability" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </FormItem>
            )} />

            {form.watch("wifi_available") === "No" && (
              <Input {...form.register("expected_monthly_price")} placeholder="Expected Monthly Price" />
            )}

            {form.watch("wifi_available") === "Yes" && (
              <>
                <FormField control={form.control} name="wifi_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Type</FormLabel>
                    <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Existing Contractor">Existing Contractor</SelectItem>
                          <SelectItem value="Personal WiFi">Personal WiFi</SelectItem>
                          <SelectItem value="Other Sources">Other Sources</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )} />

                {/* Existing Contractor */}
                {form.watch("wifi_type") === "Existing Contractor" && (
                  <>
                    <Input {...form.register("contractor_name")} placeholder="Contractor Name *" />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-medium">
                        Contract Start Date
                      </label>

                      <Input type="date" {...form.register("contract_start")} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-medium">
                        Contract End Date
                      </label>
                      <Input type="date" {...form.register("contract_expiry")} />
                    </div>
                    <Input {...form.register("wifi_plan")} placeholder="Plan / Package" />
                    <Input type="number" {...form.register("speed_mbps")} placeholder="Speed (Mbps)" />
                    <Textarea {...form.register("pain_points")} placeholder="Client Pain Points" />
                  </>
                )}

                {/* Personal WiFi */}
                {form.watch("wifi_type") === "Personal WiFi" && (
                  <>
                    <Input {...form.register("provider_plan")} placeholder="Provider / Plan" />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-medium">
                        Start Date
                      </label>
                      <Input type="date" {...form.register("personal_wifi_start")} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 font-medium">
                        End Date
                      </label>
                      <Input type="date" {...form.register("personal_wifi_expiry")} />
                    </div>
                    <Input type="number" {...form.register("personal_wifi_price")} placeholder="Monthly Price" />
                  </>
                )}

                {/* Other Sources */}
                {form.watch("wifi_type") === "Other Sources" && (
                  <Textarea {...form.register("other_wifi_details")} placeholder="Describe Internet Setup" />
                )}
              </>
            )}

            {/* Lease Expiry Date */}
            <FormField control={form.control} name="lease_expiry_due" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-slate-300">Lease Expiry Date</FormLabel>
                <Input type="date" {...field} />
              </FormItem>
            )} />

            {/* Rent Terms */}
            <Textarea {...form.register("rent_terms")} placeholder="Rent Terms" />

            {/* Competition Presence */}
            <FormField control={form.control} name="competition_status" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-300 font-semibold">Competition Presence</FormLabel>
                <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Competition Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </FormItem>
            )} />

            {/* Competiton Notes */}
            <Textarea {...form.register("competition_notes")} placeholder="Competition Notes" />

            {/* PRIORITY */}
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-300 font-semibold">Priority (1 - Low, 10 - High)</FormLabel>
                <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>{priorityLevels.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </FormItem>
            )} />

            {/* FOLLOW-UP */}
            <FormField control={form.control} name="followup_status" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-slate-300 font-semibold">Follow-up Status</FormLabel>
                <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                  </Select>
                </div>
              </FormItem>
            )} />

            {/* DATES + NOTES */}
            <FormField control={form.control} name="alert_date" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-slate-300">Alert Date</FormLabel><Input type="date" {...field} /></FormItem>
            )} />
            <Textarea {...form.register("next_action")} placeholder="Next Action" />
            <FormField control={form.control} name="next_action_due" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-slate-300">Next Action Due Date</FormLabel>
                <Input type="date" {...field} />
              </FormItem>
            )} />

            {/* IMAGES */}
            <div>
              <FormLabel className="text-xs text-slate-300">Upload Images (Optional)</FormLabel>
              <input type="file" multiple accept="image/*" {...form.register("images")} />
            </div>

            {/* SUBMIT */}
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-gradient-to-tr from-cyan-950/60 to-cyan-900/60 p-2 px-4 rounded-lg border border-cyan-700 hover:border-cyan-400 text-sm font-semibold">
              Save Enquiry
            </motion.button>

          </form>
        </Form>

      </div>
    </div>
  );
}
