"use client"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAddNewProject, useGetAreasandDeptsForRegion, useGetBusinessClients, useGetBusinessRegions } from '@/query/business/queries';
import { RootState } from '@/redux/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import * as z from 'zod';
import { toast } from 'sonner';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useRouter } from 'next/navigation';
import { DEPARTMENT_TYPES } from '@/lib/constants';
import Cookies from 'js-cookie';


const AddNewProject = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [businessClients, setBusinessClients] = React.useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = useState<any[]>([]);
  const [regionAreas, setRegionAreas] = useState<any[]>([]);
  const [role_id, setRole_id] = useState("");

  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: addNewProject, isPending: addingNewProject } = useAddNewProject();
  const {mutateAsync: getRegions, isPending: isRegionLoading} = useGetBusinessRegions();
  const { mutateAsync: getAreasForRegion, isPending: loadingAreas } = useGetAreasandDeptsForRegion();

  const fetchRoleId = () => {
    const cookieData = Cookies.get("user_role");
    if(!cookieData) return toast.error("Cookies not available");
    const jsonData = JSON.parse(cookieData);
    setRole_id(jsonData?._id);
  }

  

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
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: "",
      project_description: "",
      start_date: "",
      end_date: "",
      type: "",
      client_id: "",
      business_id: businessData?._id,
      priority: "normal",
      region_id:"",
      area_id: ""
    },
  })

  const selectedRegionId = form.watch("region_id");

  const handleFetchBusinessClients = async () => {
    const res = await getBusinessClients(businessData?._id);
    console.log("clients: ",res );
    
    if (res?.status == 200) {
      setBusinessClients(res?.data);
    }
  }

  const handleFetchBusinessRegions = async() => {
    console.log("busdata", businessData);
    
    const res = await getRegions({business_id: businessData?._id});
    console.log("regions: ", res);
    
    if(res?.status == 200){
      setBusinessRegions(res?.data);
    }
  }

  useEffect(() => {
    fetchRoleId();
    handleFetchBusinessClients();
    handleFetchBusinessRegions();
  }, []);

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

  const handleSubmit = async (data: any) => {
    data.client_id = data?.client_id == "" ? null : data?.client_id;
    data.area_id = data?.area_id == "" ? null : data?.area_id;
    data.role_id = role_id;
    console.log("Form Data:", data)
    try {
      const response = await addNewProject(data);
      console.log("Response from server:", response);
      if (response?.status == 201) {
        toast.success(response.message);
        form.reset();
      } else {
        toast.error(response?.message || "Failed to add project");
      }
    } catch (error) {
      toast.error("An error occurred while adding the project");
      console.error("Error adding project:", error);
    }
  };


  return (
    <div className="p-4">
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
      <div className="mt-2 bg-gradient-to-tr border-white from-slate-950/60 to-slate-900/60 p-3 rounded-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 flex flex-wrap items-baseline">

            {/* Project Name */}
            <FormField
              control={form.control}
              name="project_name"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Name</FormLabel>
                  <FormControl className="bg-transparent focus:bg-transparent hover:bg-transparent text-white placeholder:text-slate-400 border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Input
                      placeholder="Enter project name"
                      {...field}

                    />
                  </FormControl>
                  {selectedRegionId && loadingAreas && (
                    <FormDescription className="text-xs text-slate-400">Loading areas...</FormDescription>
                  )}
                  {selectedRegionId && !loadingAreas && regionAreas.length === 0 && (
                    <FormDescription className="text-xs text-slate-400">No areas for this region.</FormDescription>
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
                  <FormItem className="w-full lg:w-1/2 p-1">
                    <FormLabel className="text-xs text-slate-300 font-semibold">Project Area (Optional)</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ""}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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

            {/* Project Description */}
            <FormField
              control={form.control}
              name="project_description"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter project description"
                      {...field}
                      className="border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className='bg-transparent focus:bg-transparent hover:bg-transparent text-white border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">End Date</FormLabel>
                  <FormControl className='bg-transparent focus:bg-transparent hover:bg-transparent text-white border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <option disabled value="">Select Type</option>
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

            {/* Project Region */}
            <FormField
              control={form.control}
              name="region_id"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Region</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Client */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Client</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Priority</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="w-full flex justify-end mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-semibold"
              >
                Save Project
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default AddNewProject
