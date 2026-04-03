"use client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import { useAddNewProject, useGetAreasandDeptsForRegion, useGetBusinessClients, useGetBusinessRegions } from '@/query/business/queries';
import { useGetEnquiryById, useGetEnquiryContacts, useGetEqCampsById } from '@/query/enquirymanager/queries';
import { RootState } from '@/redux/store';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import { CalendarCheck, CheckCircle2, MapPinned, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  project_description: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  type: z.string(),
  client_id: z.string().nullable().optional(),
  business_id: z.string(),
  priority: z.string().optional(),
  region_id: z.string(),
  area_id: z.string().nullable().optional()
});

const formatSummaryValue = (value: any, fallback = "Not specified") => {
  if (value === null || value === undefined || value === "") return fallback;
  const resolved = value?.$numberDecimal ?? value;
  return String(resolved);
};

const formatSummaryDate = (value?: string | Date | null, fallback = "Not set") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatSummaryUsers = (users: any) => {
  if (!users) return "Not specified";
  const list = Array.isArray(users) ? users : [users];
  const names = list
    .map((user) => user?.name || user?.email || user)
    .filter(Boolean)
    .map((entry) => String(entry));
  return names.length ? names.join(", ") : "Not specified";
};

const formatSummaryContacts = (contacts: any[]) => {
  if (!Array.isArray(contacts) || contacts.length === 0) return "Not specified";

  return contacts
    .map((contact) => {
      const pieces = [
        contact?.contact_name,
        contact?.contact_designation,
        contact?.contact_phone,
        contact?.contact_email,
      ].filter(Boolean);
      return pieces.join(" | ");
    })
    .filter(Boolean)
    .join("\n");
};

const getTodayInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildProjectDescriptionFromEnquiry = ({
  enquiryPayload,
  camp,
  contacts,
}: {
  enquiryPayload: any;
  camp: any;
  contacts: any[];
}) => {
  const enquiry = enquiryPayload?.enquiry;
  if (!enquiry) return "";

  const wifiAvailability =
    enquiry?.wifi_available === true
      ? "Available"
      : enquiry?.wifi_available === false
        ? "No WiFi"
        : "Not specified";

  const wifiDetails =
    enquiry?.wifi_available === true && enquiry?.wifi_type === "Existing Contractor"
      ? [
          `Contractor: ${formatSummaryValue(enquiryPayload?.external_provider?.contractor_name)}`,
          `Plan / Package: ${formatSummaryValue(enquiryPayload?.external_provider?.contract_package)}`,
          `Speed: ${formatSummaryValue(enquiryPayload?.external_provider?.contract_speed)}`,
          `Contract Start: ${formatSummaryDate(enquiryPayload?.external_provider?.contract_start_date)}`,
          `Contract End: ${formatSummaryDate(enquiryPayload?.external_provider?.contract_end_date)}`,
          `Pain Points: ${formatSummaryValue(enquiryPayload?.external_provider?.plain_points || enquiryPayload?.external_provider?.pain_points)}`,
        ]
      : enquiry?.wifi_available === true && enquiry?.wifi_type === "Personal WiFi"
        ? [
            `Personal Plan: ${formatSummaryValue(enquiryPayload?.personal_provider?.personal_plan)}`,
            `Start Date: ${formatSummaryDate(enquiryPayload?.personal_provider?.personal_start_date)}`,
            `End Date: ${formatSummaryDate(enquiryPayload?.personal_provider?.personal_end_date)}`,
            `Monthly Price: ${formatSummaryValue(enquiryPayload?.personal_provider?.personal_monthly_price)}`,
          ]
        : enquiry?.wifi_type === "Other Sources"
          ? [`Setup Details: ${formatSummaryValue(enquiry?.wifi_setup)}`]
          : enquiry?.wifi_available === false
            ? [`Expected Monthly Price: ${formatSummaryValue(enquiry?.expected_wifi_cost)}`]
            : [];

  return [
    `Converted from enquiry ${formatSummaryValue(enquiry?.enquiry_uuid, "N/A")}`,
    "",
    "Camp Overview",
    `Camp: ${formatSummaryValue(camp?.camp_name || enquiry?.camp_id?.camp_name)}`,
    `Camp Type: ${formatSummaryValue(camp?.camp_type)}`,
    `Camp Capacity: ${formatSummaryValue(camp?.camp_capacity)}`,
    `Camp Occupancy: ${formatSummaryValue(camp?.camp_occupancy)}`,
    "",
    "Location",
    `Country: ${formatSummaryValue(enquiry?.country_id?.country_name)}`,
    `Region: ${formatSummaryValue(enquiry?.region_id?.region_name)}`,
    `Province: ${formatSummaryValue(enquiry?.province_id?.province_name)}`,
    `City: ${formatSummaryValue(enquiry?.city_id?.city_name)}`,
    `Area: ${formatSummaryValue(enquiry?.area_id?.area_name)}`,
    `Latitude: ${formatSummaryValue(camp?.latitude || enquiry?.latitude)}`,
    `Longitude: ${formatSummaryValue(camp?.longitude || enquiry?.longitude)}`,
    "",
    "Stakeholders",
    `Landlord: ${formatSummaryValue(camp?.landlord_id?.landlord_name)}`,
    `Real Estate: ${formatSummaryValue(camp?.realestate_id?.company_name)}`,
    `Client Company: ${formatSummaryValue(camp?.client_company_id?.client_company_name)}`,
    "",
    "Enquiry Users",
    `Enquiry Brought By: ${formatSummaryUsers(enquiry?.enquiry_brought_by)}`,
    `Meeting Initiated By: ${formatSummaryUsers(enquiry?.meeting_initiated_by)}`,
    `Project Closed By: ${formatSummaryUsers(enquiry?.project_closed_by)}`,
    `Project Managed By: ${formatSummaryUsers(enquiry?.project_managed_by)}`,
    `Enquiry User Notes: ${formatSummaryValue(enquiry?.enquiry_user_notes)}`,
    "",
    "Contacts",
    formatSummaryContacts(contacts),
    "",
    "Head Office",
    `Phone: ${formatSummaryValue(enquiryPayload?.head_office?.phone)}`,
    `Address: ${formatSummaryValue(enquiryPayload?.head_office?.address)}`,
    `Other Details: ${formatSummaryValue(enquiryPayload?.head_office?.other_details)}`,
    "",
    "WiFi / Internet",
    `Status: ${wifiAvailability}`,
    `Type: ${formatSummaryValue(enquiry?.wifi_type)}`,
    ...wifiDetails,
    "",
    "Lease & Follow-up",
    `Lease Expiry: ${formatSummaryDate(enquiry?.lease_expiry_due)}`,
    `Rent Terms: ${formatSummaryValue(enquiry?.rent_terms)}`,
    `Competition Presence: ${enquiry?.competition_status === true ? "Yes" : enquiry?.competition_status === false ? "No" : "Not specified"}`,
    `Competition Notes: ${formatSummaryValue(enquiry?.competition_notes)}`,
    `Status: ${formatSummaryValue(enquiry?.status, "Lead Received")}`,
    `Priority: ${enquiry?.priority ? `${enquiry.priority}/10` : "Not set"}`,
    `Next Action: ${formatSummaryValue(enquiry?.next_action)}`,
    `Next Action Due: ${formatSummaryDate(enquiry?.next_action_due)}`,
    `Alert Date: ${formatSummaryDate(enquiry?.alert_date)}`,
  ].join("\n");
};

const AddNewProject = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [businessClients, setBusinessClients] = useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = useState<any[]>([]);
  const [regionAreas, setRegionAreas] = useState<any[]>([]);
  const [role_id, setRole_id] = useState("");
  const prefillAppliedRef = useRef<string>("");
  const enquiryId = searchParams.get("enquiry_id") || "";

  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: addNewProject, isPending: addingNewProject } = useAddNewProject();
  const { mutateAsync: getRegions, isPending: isRegionLoading } = useGetBusinessRegions();
  const { mutateAsync: getAreasForRegion, isPending: loadingAreas } = useGetAreasandDeptsForRegion();
  const { data: enquiryPrefill, isLoading: isEnquiryPrefillLoading } = useGetEnquiryById(enquiryId);
  const baseCampId = enquiryPrefill?.enquiry?.camp_id?._id ?? enquiryPrefill?.enquiry?.camp_id;
  const { data: enquiryCampPrefill, isLoading: isCampPrefillLoading } = useGetEqCampsById(baseCampId || "");
  const { data: enquiryContactsPrefill, isLoading: isContactsPrefillLoading } = useGetEnquiryContacts(enquiryId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: "",
      project_description: "",
      start_date: "",
      end_date: "",
      type: "",
      client_id: "",
      business_id: "",
      priority: "normal",
      region_id: "",
      area_id: ""
    },
  });

  const selectedRegionId = form.watch("region_id");
  const summaryValues = form.watch();

  useEffect(() => {
    if (businessData?._id) {
      form.setValue("business_id", businessData._id);
    }
  }, [businessData?._id, form]);

  useEffect(() => {
    if (!enquiryId) return;
    if (prefillAppliedRef.current === enquiryId) return;
    if (isEnquiryPrefillLoading || isContactsPrefillLoading) return;
    if (baseCampId && isCampPrefillLoading) return;
    if (!enquiryPrefill?.enquiry) return;

    const camp = enquiryCampPrefill?.camp || enquiryPrefill?.enquiry?.camp_id;
    const contacts = enquiryContactsPrefill?.contacts ?? enquiryPrefill?.contacts ?? [];

    form.reset({
      project_name: camp?.camp_name || enquiryPrefill?.enquiry?.camp_id?.camp_name || "",
      project_description: buildProjectDescriptionFromEnquiry({
        enquiryPayload: enquiryPrefill,
        camp,
        contacts,
      }),
      start_date: getTodayInputValue(),
      end_date: "",
      type: "sales",
      client_id: "",
      business_id: businessData?._id ?? form.getValues("business_id") ?? "",
      priority: "normal",
      region_id: "",
      area_id: "",
    });

    prefillAppliedRef.current = enquiryId;
  }, [
    enquiryId,
    enquiryPrefill,
    enquiryCampPrefill,
    enquiryContactsPrefill,
    isEnquiryPrefillLoading,
    isCampPrefillLoading,
    isContactsPrefillLoading,
    baseCampId,
    businessData?._id,
    form,
  ]);

  const fetchRoleId = () => {
    const cookieData = Cookies.get("user_role");
    if (!cookieData) return toast.error("Cookies not available");
    try {
      const jsonData = JSON.parse(cookieData);
      setRole_id(jsonData?._id ?? "");
    } catch (error) {
      toast.error("Invalid role cookie data");
    }
  };

  const handleFetchBusinessClients = async () => {
    if (!businessData?._id) return;
    const res = await getBusinessClients(businessData?._id);
    if (res?.status == 200) {
      setBusinessClients(res?.data ?? []);
    } else {
      setBusinessClients([]);
    }
  };

  const handleFetchBusinessRegions = async () => {
    if (!businessData?._id) return;
    const res = await getRegions({ business_id: businessData?._id });
    if (res?.status == 200) {
      setBusinessRegions(res?.data ?? []);
    } else {
      setBusinessRegions([]);
    }
  };

  useEffect(() => {
    fetchRoleId();
  }, []);

  useEffect(() => {
    if (!businessData?._id) return;
    handleFetchBusinessClients();
    handleFetchBusinessRegions();
  }, [businessData?._id]);

  useEffect(() => {
    const fetchAreas = async () => {
      if (!selectedRegionId) {
        form.setValue("area_id", "");
        setRegionAreas([]);
        return;
      }
      setRegionAreas([]);
      form.setValue("area_id", "");
      const res = await getAreasForRegion(selectedRegionId);
      if (res?.status === 200) {
        setRegionAreas(res?.data?.areas ?? []);
      } else {
        setRegionAreas([]);
      }
    };

    fetchAreas();
  }, [selectedRegionId, getAreasForRegion, form]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const payload = {
      ...data,
      client_id: data?.client_id == "" ? null : data?.client_id,
      area_id: data?.area_id == "" ? null : data?.area_id,
      role_id,
      enquiry_id: enquiryId || undefined,
    };
    try {
      const response = await addNewProject(payload);
      if (response?.status == 201) {
        toast.success(response.message);
        form.reset({
          project_name: "",
          project_description: "",
          start_date: "",
          end_date: "",
          type: "",
          client_id: "",
          business_id: businessData?._id ?? "",
          priority: "normal",
          region_id: "",
          area_id: ""
        });
      } else {
        toast.error(response?.message || "Failed to add project");
      }
    } catch (error) {
      toast.error("An error occurred while adding the project");
      console.error("Error adding project:", error);
    }
  };

  const selectedRegionName = useMemo(() => {
    return businessRegions.find((region: any) => region._id === summaryValues.region_id)?.region_name || "-";
  }, [businessRegions, summaryValues.region_id]);

  const selectedAreaName = useMemo(() => {
    return regionAreas.find((area: any) => area._id === summaryValues.area_id)?.area_name || "-";
  }, [regionAreas, summaryValues.area_id]);

  const selectedClientName = useMemo(() => {
    return businessClients.find((client: any) => client._id === summaryValues.client_id)?.client_name || "-";
  }, [businessClients, summaryValues.client_id]);

  const selectedTypeLabel = useMemo(() => {
    return DEPARTMENT_TYPES.find((type) => type.value === summaryValues.type)?.label || "-";
  }, [summaryValues.type]);

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/70">Create Project</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-100">Create a fresh project.</h1>
            <p className="mt-1 text-xs text-slate-400">
              {enquiryId && enquiryPrefill?.enquiry?.enquiry_uuid
                ? `Prefilled from enquiry ${enquiryPrefill.enquiry.enquiry_uuid}.`
                : "Capture the essentials now, refine teams and tasks later."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="rounded-full border border-slate-700 px-3 py-1">Step 1 of 3</span>
            <span className="rounded-full border border-cyan-700/60 bg-cyan-500/10 px-3 py-1 text-cyan-200">Basic Info</span>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span className="font-semibold">Project Identity</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="project_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-xs text-slate-300 font-semibold">Project Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. North Region Sales Expansion"
                              {...field}
                              className="border-slate-700 focus:border-cyan-500 focus-visible:ring-0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="project_description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-xs text-slate-300 font-semibold">Project Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Short summary of what success looks like"
                              {...field}
                              className="min-h-[90px] border-slate-700 focus:border-cyan-500 focus-visible:ring-0"
                            />
                          </FormControl>
                          <FormDescription className="text-[11px] text-slate-500">Optional, but helps teams align quickly.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CalendarCheck size={14} className="text-emerald-400" />
                    <span className="font-semibold">Timeline</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className='border-slate-700 focus:border-cyan-500 focus-visible:ring-0'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className='border-slate-700 focus:border-cyan-500 focus-visible:ring-0'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPinned size={14} className="text-amber-300" />
                    <span className="font-semibold">Scope and Location</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">Project Domain</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-sm focus:border-cyan-500 focus:outline-none"
                            >
                              <option disabled value="">Select Domain</option>
                              {DEPARTMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">Priority</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-sm focus:border-cyan-500 focus:outline-none"
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">Region</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-sm focus:border-cyan-500 focus:outline-none"
                            >
                              {businessRegions && businessRegions.length > 0 ? (
                                <>
                                  <option value="">Select Region</option>
                                  {businessRegions.map((region: any) => (
                                    <option key={region._id} value={region._id}>
                                      {region.region_name}
                                    </option>
                                  ))}
                                </>
                              ) : (
                                <option value="">No Regions</option>
                              )}
                            </select>
                          </FormControl>
                          {selectedRegionId && loadingAreas && (
                            <FormDescription className="text-[11px] text-slate-400">Loading areas...</FormDescription>
                          )}
                          {selectedRegionId && !loadingAreas && regionAreas.length === 0 && (
                            <FormDescription className="text-[11px] text-slate-400">No areas for this region.</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedRegionId && regionAreas.length > 0 && (
                      <FormField
                        control={form.control}
                        name="area_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-slate-300 font-semibold">Project Area (Optional)</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                value={field.value ?? ""}
                                className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-sm focus:border-cyan-500 focus:outline-none"
                              >
                                <option value="">Select Area (Optional)</option>
                                {regionAreas.map((area: any) => (
                                  <option key={area._id} value={area._id}>
                                    {area.area_name}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 size={14} className="text-cyan-300" />
                    <span className="font-semibold">Client</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300 font-semibold">Client (Optional)</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 text-sm focus:border-cyan-500 focus:outline-none"
                            >
                              {businessClients && businessClients.length > 0 ? (
                                <>
                                  <option value="">Select Client</option>
                                  {businessClients.map((client: any) => (
                                    <option key={client._id} value={client._id}>
                                      {client.client_name}
                                    </option>
                                  ))}
                                </>
                              ) : (
                                <option value="">No Clients</option>
                              )}
                            </select>
                          </FormControl>
                          <FormDescription className="text-[11px] text-slate-500">
                            {loadingBusinessClients ? "Loading clients..." : "Linking a client keeps the timeline accountable."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push('/admin/projects')}
                    className="w-full text-xs sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full text-xs bg-cyan-600 hover:bg-cyan-700 sm:w-auto"
                    disabled={addingNewProject || isRegionLoading}
                  >
                    {addingNewProject ? "Saving..." : "Save Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <h2 className="text-xs font-semibold text-slate-200">Project Snapshot</h2>
              <p className="mt-1 text-[11px] text-slate-500">Live preview of the details you are capturing.</p>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-500">Name</p>
                  <p className="text-slate-200 font-semibold">{summaryValues.project_name || "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Domain</p>
                  <p className="text-slate-300">{selectedTypeLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Priority</p>
                  <p className="text-slate-300 capitalize">{summaryValues.priority || "normal"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Region</p>
                  <p className="text-slate-300">{selectedRegionName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Area</p>
                  <p className="text-slate-300">{summaryValues.region_id ? selectedAreaName : "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Client</p>
                  <p className="text-slate-300">{summaryValues.client_id ? selectedClientName : "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Timeline</p>
                  <p className="text-slate-300">
                    {summaryValues.start_date || "-"} to {summaryValues.end_date || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950/60 to-slate-900/60 p-4">
              <h3 className="text-xs font-semibold text-slate-200">What happens next</h3>
              <ul className="mt-3 space-y-2 text-[11px] text-slate-400">
                <li>Assign departments and teams after creation.</li>
                <li>Track approvals and progress in the project view.</li>
                <li>Upload key documents once the project is live.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewProject;
