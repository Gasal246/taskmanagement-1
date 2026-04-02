"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { Avatar } from "antd";
import { CalendarIcon, CalendarPlus, Check, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { TASK_STATUS } from "@/lib/constants";
import {
  useAddBusinessTask,
  useGetAllStaffsForStaff,
  useGetAreasandDeptsForRegion,
  useGetLocationsandDeptsForArea,
  useGetDeptsforLoation,
  useGetStaffsByDepartment,
  useGetBusinessSkills,
} from "@/query/business/queries";

const resolveDomainId = (roleName: string, domainData: any) => {
  switch (roleName) {
    case "REGION_HEAD":
    case "REGION_STAFF":
      return domainData?.region_id;
    case "AREA_HEAD":
    case "AREA_STAFF":
      return domainData?.area_id;
    case "LOCATION_HEAD":
    case "LOCATION_STAFF":
      return domainData?.location_id;
    case "REGION_DEP_HEAD":
    case "REGION_DEP_STAFF":
    case "AREA_DEP_HEAD":
    case "AREA_DEP_STAFF":
    case "LOCATION_DEP_HEAD":
    case "LOCATION_DEP_STAFF":
      return domainData?.department_id;
    default:
      return domainData?.value;
  }
};

const normalizeStaff = (staff: any) => {
  const user = staff?.user_id || staff?.staff_id || staff?.user || staff;
  return {
    _id: user?._id,
    name: user?.name || staff?.name || "",
    email: user?.email || staff?.email || "",
    avatar_url: user?.avatar_url || staff?.avatar_url || null,
    skills: staff?.skills || user?.skills || [],
  };
};

const formSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  task_description: z.string().optional(),
  priority: z.string().optional(),
  comments: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  assigned_user_id: z.string().min(1, "Assigned user is required"),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
  business_id: z.string(),
});

const steps = [
  { id: 1, title: "Departments", description: "Choose where the staff belongs." },
  { id: 2, title: "Skills", description: "Filter by skills (optional)." },
  { id: 3, title: "Staff", description: "Pick the staff member." },
];

const AddTask = () => {
  const router = useRouter();
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const { mutateAsync: GetStaffs, isPending: loadingStaffData } = useGetAllStaffsForStaff();
  const { mutateAsync: getStaffsByDepartment } = useGetStaffsByDepartment();
  const { mutateAsync: getAreasAndDeptsForRegion } = useGetAreasandDeptsForRegion();
  const { mutateAsync: getLocationsAndDeptsForArea } = useGetLocationsandDeptsForArea();
  const { mutateAsync: getDeptsForLocation } = useGetDeptsforLoation();
  const { mutateAsync: getBusinessSkills } = useGetBusinessSkills();

  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [domainData, setDomainData] = useState<any>(null);
  const [businessId, setBusinessId] = useState("");

  const [step, setStep] = useState(1);
  const [assignScope, setAssignScope] = useState<"my" | "other">("my");
  const [departmentTree, setDepartmentTree] = useState<any>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");

  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [loadingDeptStaffs, setLoadingDeptStaffs] = useState(false);

  const [skills, setSkills] = useState<any[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  const [activityMap, setActivityMap] = useState<Record<string, any[]>>({});
  const [loadingActivities, setLoadingActivities] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      priority: "",
      comments: "",
      start_date: "",
      end_date: "",
      assigned_user_id: "",
      status: "To Do",
      business_id: "",
    },
  });
  const selectedStartDate = form.watch("start_date");
  const selectedEndDate = form.watch("end_date");
  const todayDate = new Date().toISOString().split("T")[0];
  const today = new Date(`${todayDate}T00:00:00`);
  const selectedDateRange: DateRange | undefined = selectedStartDate
    ? {
        from: new Date(`${selectedStartDate}T00:00:00`),
        to: selectedEndDate ? new Date(`${selectedEndDate}T00:00:00`) : undefined,
      }
    : undefined;

  useEffect(() => {
    const roleCookie = Cookies.get("user_role");
    const domainCookie = Cookies.get("user_domain");
    if (!roleCookie || !domainCookie) {
      toast.error("Cookies not found");
      return;
    }
    try {
      const roleJson = JSON.parse(roleCookie);
      const domainJson = JSON.parse(domainCookie);
      setRoleId(roleJson?._id || "");
      setRoleName(roleJson?.role_name || "");
      setDomainData(domainJson);
      setBusinessId(domainJson?.business_id || "");
      form.setValue("business_id", domainJson?.business_id || "");
    } catch (error) {
      toast.error("Invalid cookies");
    }
  }, [form]);

  useEffect(() => {
    const endDate = form.getValues("end_date");
    if (selectedStartDate && endDate && endDate < selectedStartDate) {
      form.setValue("end_date", "");
    }
    if (!selectedStartDate && endDate) {
      form.setValue("end_date", "");
    }
  }, [selectedStartDate, form]);

  const fetchDepartmentMeta = useCallback(async (departmentId: string) => {
    const response = await fetch(`/api/department/get-meta?department_id=${departmentId}`);
    const data = await response.json();
    return data?.data;
  }, []);

  const loadMyStaffs = useCallback(async () => {
    if (!roleId || !roleName || !domainData) return;
    const domainId = resolveDomainId(roleName, domainData);
    if (!domainId) return;
    const res = await GetStaffs({ role_id: roleId, domain_id: domainId });
    if (res?.status === 200) {
      setStaffOptions((res?.data || []).map(normalizeStaff));
    } else {
      setStaffOptions([]);
    }
  }, [GetStaffs, domainData, roleId, roleName]);

  const loadDepartmentTree = useCallback(async () => {
    if (!roleName || !domainData) return;
    setLoadingDepartments(true);

    if (roleName.includes("REGION")) {
      let regionId = roleName === "REGION_HEAD" ? domainData?.region_id : null;
      if (!regionId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        regionId = meta?.region_id || null;
      }
      if (!regionId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const regionRes = await getAreasAndDeptsForRegion(regionId);
      const regionDepartments = regionRes?.data?.region_departments || [];
      const areas = regionRes?.data?.areas || [];
      const areaNodes = await Promise.all(
        areas.map(async (area: any) => {
          const areaRes = await getLocationsAndDeptsForArea(area._id);
          const areaDepartments = areaRes?.data?.area_departments || [];
          const locations = areaRes?.data?.locations || [];
          const locationNodes = await Promise.all(
            locations.map(async (location: any) => {
              const locRes = await getDeptsForLocation(location._id);
              return {
                location: locRes?.data?.location || location,
                locationDepartments: locRes?.data?.location_departments || [],
              };
            })
          );
          return {
            area: areaRes?.data?.area || area,
            areaDepartments,
            locations: locationNodes,
          };
        })
      );
      setDepartmentTree({ mode: "region", regionDepartments, areas: areaNodes });
      setLoadingDepartments(false);
      return;
    }

    if (roleName.includes("AREA")) {
      let areaId = roleName === "AREA_HEAD" ? domainData?.area_id : null;
      if (!areaId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        areaId = meta?.area_id || null;
      }
      if (!areaId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const areaRes = await getLocationsAndDeptsForArea(areaId);
      const areaDepartments = areaRes?.data?.area_departments || [];
      const locations = areaRes?.data?.locations || [];
      const locationNodes = await Promise.all(
        locations.map(async (location: any) => {
          const locRes = await getDeptsForLocation(location._id);
          return {
            location: locRes?.data?.location || location,
            locationDepartments: locRes?.data?.location_departments || [],
          };
        })
      );
      setDepartmentTree({ mode: "area", area: areaRes?.data?.area || null, areaDepartments, locations: locationNodes });
      setLoadingDepartments(false);
      return;
    }

    if (roleName.includes("LOCATION")) {
      let locationId = roleName === "LOCATION_HEAD" ? domainData?.location_id : null;
      if (!locationId && domainData?.department_id) {
        const meta = await fetchDepartmentMeta(domainData.department_id);
        locationId = meta?.location_id || null;
      }
      if (!locationId) {
        setDepartmentTree(null);
        setLoadingDepartments(false);
        return;
      }
      const locationRes = await getDeptsForLocation(locationId);
      setDepartmentTree({
        mode: "location",
        location: locationRes?.data?.location || null,
        locationDepartments: locationRes?.data?.location_departments || [],
      });
      setLoadingDepartments(false);
      return;
    }

    setDepartmentTree(null);
    setLoadingDepartments(false);
  }, [
    domainData,
    fetchDepartmentMeta,
    getAreasAndDeptsForRegion,
    getDeptsForLocation,
    getLocationsAndDeptsForArea,
    roleName,
  ]);

  useEffect(() => {
    if (!roleName || !domainData || !roleId) return;
    setSelectedDepartmentId(null);
    setSelectedDepartmentName("");
    setStaffOptions([]);
    setSelectedStaff(null);
    setStaffSearch("");
    setLoadingDeptStaffs(false);
    form.setValue("assigned_user_id", "");

    if (assignScope === "my") {
      loadMyStaffs();
    } else {
      loadDepartmentTree();
    }
  }, [assignScope, domainData, form, loadDepartmentTree, loadMyStaffs, roleId, roleName]);

  useEffect(() => {
    if (step !== 2 || !businessId) return;
    const loadSkills = async () => {
      setLoadingSkills(true);
      const res = await getBusinessSkills(businessId);
      if (res?.status === 200) {
        setSkills(res?.data || []);
      } else {
        setSkills([]);
      }
      setLoadingSkills(false);
    };
    loadSkills();
  }, [step, businessId, getBusinessSkills]);

  useEffect(() => {
    const loadActivities = async () => {
      const ids = staffOptions.map((staff) => staff._id).filter(Boolean);
      if (ids.length === 0) {
        setActivityMap({});
        return;
      }
      setLoadingActivities(true);
      const query = new URLSearchParams({ staff_ids: ids.join(",") });
      const response = await fetch(`/api/task/activities/by-staff?${query.toString()}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data?.status === 200) {
        setActivityMap(data?.data || {});
      } else {
        setActivityMap({});
      }
      setLoadingActivities(false);
    };

    loadActivities();
  }, [staffOptions]);

  const handleSelectDepartment = async (department: any) => {
    if (!department?._id) return;
    setSelectedDepartmentId(department._id);
    setSelectedDepartmentName(department?.dep_name || department?.department_name || "Department");
    setSelectedStaff(null);
    setStaffSearch("");
    form.setValue("assigned_user_id", "");
    setLoadingDeptStaffs(true);
    const res = await getStaffsByDepartment(department._id);
    if (res?.status === 200) {
      setStaffOptions((res?.data || []).map(normalizeStaff));
    } else {
      setStaffOptions([]);
    }
    setLoadingDeptStaffs(false);
  };

  const filteredSkills = useMemo(() => {
    const term = skillSearch.trim().toLowerCase();
    if (!term) return skills;
    return skills.filter((skill: any) =>
      (skill?.skill_name || "").toLowerCase().includes(term)
    );
  }, [skills, skillSearch]);

  const selectedSkillSet = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds]);

  const visibleStaffs = useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    let base = staffOptions;

    if (selectedSkillIds.length > 0) {
      base = base.filter((staff) => {
        const skillIds = (staff?.skills || [])
          .map((skill: any) => skill?.skill_id?._id || skill?.skill_id)
          .filter(Boolean)
          .map((id: any) => id.toString());
        return skillIds.some((id: string) => selectedSkillSet.has(id));
      });
    }

    if (!term) return base;
    return base.filter((staff) => {
      const name = staff?.name || "";
      const email = staff?.email || "";
      return `${name} ${email}`.toLowerCase().includes(term);
    });
  }, [staffOptions, staffSearch, selectedSkillIds, selectedSkillSet]);

  const handleStaffSelect = (staff: any) => {
    setSelectedStaff(staff);
    form.setValue("assigned_user_id", staff?._id || "", { shouldValidate: true });
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const newTask = {
      task_name: data.task_name,
      task_description: data.task_description,
      priority: data.priority || undefined,
      comments: data.comments || undefined,
      start_date: data.start_date,
      end_date: data.end_date,
      status: data.status,
      business_id: data.business_id,
      is_project_task: false,
      assigned_to: data.assigned_user_id,
      project_id: null,
    };

    try {
      const response = await addTask(newTask);
      if (response?.status === 201) {
        toast.success(response?.data?.message || "Task added successfully");
        form.reset();
        setSelectedStaff(null);
        setStaffSearch("");
        router.push(`/staff/tasks/${response?.data?.data?._id}`);
      } else {
        toast.error(response?.data?.message || "Failed to add task");
      }
    } catch (error) {
      toast.error("An error occurred while adding the task");
    }
  };

  const handleTaskDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) {
      form.setValue("start_date", "", { shouldValidate: true });
      form.setValue("end_date", "", { shouldValidate: true });
      return;
    }

    form.setValue("start_date", format(range.from, "yyyy-MM-dd"), { shouldValidate: true });
    form.setValue("end_date", range.to ? format(range.to, "yyyy-MM-dd") : "", {
      shouldValidate: true,
    });
  };

  const canContinueFromStep1 = assignScope === "my" || Boolean(selectedDepartmentId);

  return (
    <div className="p-4 pb-20 space-y-4">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push("/staff/tasks")}>Manage Tasks</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Task</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/70 to-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Staff Tasks</p>
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <CalendarPlus size={18} /> Create New Task
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Assign a task to a staff member using the guided selection flow.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-900"
            onClick={() => router.push("/staff/tasks")}
          >
            Back to Tasks
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {steps.map((item) => {
            const isActive = item.id === step;
            const isDone = item.id < step;
            return (
              <div key={item.id} className="flex items-center gap-2 text-xs text-slate-400">
                <div
                  className={`h-7 w-7 rounded-full border flex items-center justify-center ${
                    isDone
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : isActive
                        ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                        : "border-slate-700 text-slate-500"
                  }`}
                >
                  {isDone ? <Check size={14} /> : item.id}
                </div>
                <div>
                  <p className={`font-semibold ${isActive ? "text-slate-200" : "text-slate-400"}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
                {item.id !== steps.length && <ChevronRight size={14} className="text-slate-600" />}
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200">Task Details</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Task Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Name the task"
                          {...field}
                          className="bg-transparent border-slate-700 text-base font-semibold text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <p className="text-[11px] text-slate-500">
                        Clear task titles help teams stay aligned and move faster.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Task Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a short, encouraging description for the assignee."
                          {...field}
                          className="min-h-[120px] border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional additional comments for this task."
                          {...field}
                          className="min-h-[90px] border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2 space-y-2">
                    <FormLabel className="text-xs text-slate-300 font-semibold">
                      Task Duration (Start & End)
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900/60 hover:text-slate-100"
                        >
                          <span className="truncate text-left">
                            {selectedDateRange?.from ? (
                              selectedDateRange?.to ? (
                                `${format(selectedDateRange.from, "PPP")} - ${format(
                                  selectedDateRange.to,
                                  "PPP"
                                )}`
                              ) : (
                                `${format(selectedDateRange.from, "PPP")} - Select end date`
                              )
                            ) : (
                              "Select start and end dates"
                            )}
                          </span>
                          <CalendarIcon size={16} className="opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 border-slate-800 bg-slate-950"
                        align="start"
                      >
                        <Calendar
                          mode="range"
                          numberOfMonths={2}
                          defaultMonth={selectedDateRange?.from || today}
                          selected={selectedDateRange}
                          onSelect={handleTaskDateRangeChange}
                          disabled={(date) => date < today}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="space-y-1">
                      {form.formState.errors.start_date && (
                        <p className="text-[0.8rem] font-medium text-destructive">
                          {form.formState.errors.start_date.message}
                        </p>
                      )}
                      {form.formState.errors.end_date && (
                        <p className="text-[0.8rem] font-medium text-destructive">
                          {form.formState.errors.end_date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-300 font-semibold">Task Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="border-slate-700 focus:border-slate-500">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                            value={field.value || "none"}
                          >
                            <SelectTrigger className="border-slate-700 focus:border-slate-500">
                              <SelectValue placeholder="No priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No priority</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-gradient-to-br from-slate-950/60 to-slate-900/70 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users size={16} /> Assignment Steps
              </h2>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignScope("my")}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                        assignScope === "my"
                          ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      My Department
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignScope("other")}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                        assignScope === "other"
                          ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      Other Department
                    </button>
                  </div>

                  {assignScope === "other" && (
                    <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                      <p className="text-xs text-slate-400 mb-2">Departments</p>
                      {loadingDepartments && (
                        <div className="w-full flex items-center justify-center h-[10vh]">
                          <span className="text-xs text-slate-400">Loading departments...</span>
                        </div>
                      )}
                      {!loadingDepartments && !departmentTree && (
                        <p className="text-xs text-slate-500">No departments available.</p>
                      )}

                      {!loadingDepartments && departmentTree?.mode === "region" && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] uppercase text-slate-500 mb-2">Region Departments</p>
                            <div className="flex flex-wrap gap-2">
                              {departmentTree.regionDepartments?.map((dept: any) => (
                                <button
                                  key={dept._id}
                                  type="button"
                                  onClick={() => handleSelectDepartment(dept)}
                                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                    selectedDepartmentId === dept._id
                                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {dept.dep_name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Accordion type="multiple" className="border-t border-slate-800/60">
                            {departmentTree.areas?.map((areaNode: any) => (
                              <AccordionItem key={areaNode.area?._id} value={areaNode.area?._id}>
                                <AccordionTrigger className="text-slate-200">
                                  {areaNode.area?.area_name || "Area"}
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2">
                                    <p className="text-[11px] uppercase text-slate-500">Area Departments</p>
                                    <div className="flex flex-wrap gap-2">
                                      {areaNode.areaDepartments?.map((dept: any) => (
                                        <button
                                          key={dept._id}
                                          type="button"
                                          onClick={() => handleSelectDepartment(dept)}
                                          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                            selectedDepartmentId === dept._id
                                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                              : "border-slate-700 text-slate-300 hover:border-slate-500"
                                          }`}
                                        >
                                          {dept.dep_name}
                                        </button>
                                      ))}
                                    </div>
                                    <Accordion type="multiple" className="border-l border-slate-800/60 pl-3">
                                      {areaNode.locations?.map((locationNode: any) => (
                                        <AccordionItem
                                          key={locationNode.location?._id}
                                          value={locationNode.location?._id}
                                        >
                                          <AccordionTrigger className="text-slate-300">
                                            {locationNode.location?.location_name || "Location"}
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <div className="flex flex-wrap gap-2">
                                              {locationNode.locationDepartments?.map((dept: any) => (
                                                <button
                                                  key={dept._id}
                                                  type="button"
                                                  onClick={() => handleSelectDepartment(dept)}
                                                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                                    selectedDepartmentId === dept._id
                                                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                                                  }`}
                                                >
                                                  {dept.dep_name}
                                                </button>
                                              ))}
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      ))}
                                    </Accordion>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      )}

                      {!loadingDepartments && departmentTree?.mode === "area" && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] uppercase text-slate-500 mb-2">Area Departments</p>
                            <div className="flex flex-wrap gap-2">
                              {departmentTree.areaDepartments?.map((dept: any) => (
                                <button
                                  key={dept._id}
                                  type="button"
                                  onClick={() => handleSelectDepartment(dept)}
                                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                    selectedDepartmentId === dept._id
                                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {dept.dep_name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Accordion type="multiple" className="border-t border-slate-800/60">
                            {departmentTree.locations?.map((locationNode: any) => (
                              <AccordionItem
                                key={locationNode.location?._id}
                                value={locationNode.location?._id}
                              >
                                <AccordionTrigger className="text-slate-200">
                                  {locationNode.location?.location_name || "Location"}
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="flex flex-wrap gap-2">
                                    {locationNode.locationDepartments?.map((dept: any) => (
                                      <button
                                        key={dept._id}
                                        type="button"
                                        onClick={() => handleSelectDepartment(dept)}
                                        className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                          selectedDepartmentId === dept._id
                                            ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                        }`}
                                      >
                                        {dept.dep_name}
                                      </button>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      )}

                      {!loadingDepartments && departmentTree?.mode === "location" && (
                        <div>
                          <p className="text-[11px] uppercase text-slate-500 mb-2">Location Departments</p>
                          <div className="flex flex-wrap gap-2">
                            {departmentTree.locationDepartments?.map((dept: any) => (
                              <button
                                key={dept._id}
                                type="button"
                                onClick={() => handleSelectDepartment(dept)}
                                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                  selectedDepartmentId === dept._id
                                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                                }`}
                              >
                                {dept.dep_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400">Selected Department</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {assignScope === "my" ? "My Department" : selectedDepartmentName || "Select a department"}
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400 mb-2">Search Skills</p>
                    <Input
                      placeholder="Search skills..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400 mb-2">Selected Skills</p>
                    {selectedSkillIds.length === 0 && (
                      <p className="text-xs text-slate-500">No skills selected.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {selectedSkillIds.map((skillId) => {
                        const skill = skills.find((item: any) => item?._id === skillId);
                        return (
                          <button
                            key={skillId}
                            type="button"
                            onClick={() =>
                              setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId))
                            }
                            className="text-[10px] px-2 py-1 rounded-full border border-slate-700 text-slate-200 hover:border-rose-500/60 hover:text-rose-300"
                          >
                            {skill?.skill_name || "Skill"} x
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3 max-h-[240px] overflow-y-auto">
                    {loadingSkills && (
                      <p className="text-xs text-slate-400">Loading skills...</p>
                    )}
                    {!loadingSkills && filteredSkills.length === 0 && (
                      <p className="text-xs text-slate-500">No skills found.</p>
                    )}
                    {!loadingSkills && filteredSkills.map((skill: any) => {
                      const isSelected = selectedSkillIds.includes(skill?._id);
                      return (
                        <button
                          key={skill?._id}
                          type="button"
                          onClick={() => {
                            setSelectedSkillIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== skill?._id)
                                : [...prev, skill?._id]
                            );
                          }}
                          className={`w-full text-left text-xs px-3 py-2 rounded-lg border mb-2 transition-colors ${
                            isSelected
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {skill?.skill_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400">Selected Department</p>
                    <p className="text-sm text-slate-200 mt-1">
                      {assignScope === "my" ? "My Department" : selectedDepartmentName || "Select a department"}
                    </p>
                    {selectedSkillIds.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-2">
                        Filtering by {selectedSkillIds.length} skill{selectedSkillIds.length > 1 ? "s" : ""}.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
                    <Input
                      placeholder="Search staff..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                    />
                    <div className="mt-3 max-h-[320px] overflow-y-auto space-y-3">
                      {assignScope === "my" && loadingStaffData && (
                        <p className="text-xs text-slate-400">Loading staff...</p>
                      )}
                      {assignScope === "other" && loadingDeptStaffs && (
                        <p className="text-xs text-slate-400">Loading staff...</p>
                      )}
                      {!loadingStaffData && !loadingDeptStaffs && visibleStaffs.length === 0 && (
                        <p className="text-xs text-slate-500">No matching staff found.</p>
                      )}
                      {visibleStaffs.map((staff) => {
                        const activities = activityMap[staff._id] || [];
                        return (
                          <button
                            key={staff._id}
                            type="button"
                            onClick={() => handleStaffSelect(staff)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedStaff?._id === staff._id
                                ? "border-cyan-500/60 bg-cyan-500/10"
                                : "border-slate-800 hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar src={staff?.avatar_url || "/avatar.png"} size={36} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-slate-200 font-semibold">{staff.name}</p>
                                    <p className="text-[11px] text-slate-500">{staff.email}</p>
                                  </div>
                                  {selectedStaff?._id === staff._id && (
                                    <span className="text-[10px] text-cyan-200">Selected</span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(staff.skills || []).slice(0, 3).map((skill: any) => (
                                    <span
                                      key={skill?._id || skill?.skill_id?._id}
                                      className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300"
                                    >
                                      {skill?.skill_id?.skill_name || skill?.skill_name || "Skill"}
                                    </span>
                                  ))}
                                  {(staff.skills || []).length > 3 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">
                                      +{(staff.skills || []).length - 3}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 text-[11px] text-slate-400">
                                  <p className="text-[11px] text-slate-500">Active Activities</p>
                                  {loadingActivities && <p>Loading activities...</p>}
                                  {!loadingActivities && activities.length === 0 && (
                                    <p className="text-slate-500">No active activities.</p>
                                  )}
                                  {!loadingActivities && activities.length > 0 && (
                                    <ul className="mt-1 space-y-1">
                                      {activities.slice(0, 3).map((activity: any) => (
                                        <li key={activity._id} className="text-slate-300">
                                          - {activity.activity}
                                          {activity.task_name ? ` - ${activity.task_name}` : ""}
                                        </li>
                                      ))}
                                      {activities.length > 3 && (
                                        <li className="text-slate-500">+{activities.length - 3} more</li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <FormField
                      control={form.control}
                      name="assigned_user_id"
                      render={() => (
                        <FormItem>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-200"
                  onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                  disabled={step === 1}
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button
                    type="button"
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950"
                    onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                    disabled={step === 1 && !canContinueFromStep1}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-950"
                    disabled={addingTask || loadingStaffData || loadingDeptStaffs}
                  >
                    {addingTask ? "Saving..." : "Save Task"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddTask;
