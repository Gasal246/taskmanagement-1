"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RootState } from "@/redux/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskTagsInput, useTaskTags } from "@/components/task/TaskTagsInput";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import * as z from "zod";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { useAddBusinessTask } from "@/query/business/queries";
import { useTaskAssignmentOptions } from "@/query/business/task-assignment";
import type { AssignmentDepartment, AssignmentStaff } from "@/types/task-assignment";
import { TASK_STATUS } from "@/lib/constants";
import { Check, Search, Sparkles } from "lucide-react";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Avatar } from "antd";

const AddTask = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const [regionId, setRegionId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<AssignmentDepartment | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<AssignmentStaff | null>(null);
  const { regions, options, staffs } = useTaskAssignmentOptions(businessData?._id, regionId, areaId, locationId, selectedDepartment);
  const loadingOptions = regions.isFetching || options.isFetching;
  const optionsError = regions.isError || options.isError;
  const loadingStaffs = staffs.isFetching;
  const assignmentOptions = options.data;
  const staffOptions = staffs.data || [];

  const formSchema = z.object({
    task_name: z.string().min(1, "Task name is required"),
    task_description: z.string().optional(),
    priority: z.string().optional(),
    comments: z.string().optional(),
    assigned_user_id: z.string().min(1, "Assigned user is required"),
    status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
    business_id: z.string(),
  });

  const taskTags = useTaskTags();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      priority: "",
      comments: "",
      assigned_user_id: "",
      status: "To Do",
      business_id: businessData?._id,
    },
  });
  useEffect(() => {
    if (businessData?._id) {
      form.setValue("business_id", businessData._id);
    }
  }, [businessData?._id, form]);

  useEffect(() => {
    setRegionId("");
    setAreaId("");
    setLocationId("");
    setSelectedDepartment(null);
    setSelectedStaff(null);
    setDepartmentSearch("");
    setStaffSearch("");
    form.setValue("assigned_user_id", "");
  }, [businessData?._id, form]);

  const clearAssignment = () => {
    setSelectedDepartment(null);
    setSelectedStaff(null);
    setDepartmentSearch("");
    setStaffSearch("");
    form.setValue("assigned_user_id", "");
    form.clearErrors("assigned_user_id");
  };

  const handleSelectDepartment = (department: AssignmentDepartment) => {
    setSelectedDepartment(department);
    setStaffSearch("");
    setSelectedStaff(null);
    form.setValue("assigned_user_id", "");
    form.clearErrors("assigned_user_id");
  };

  const handleSelectStaff = (staff: AssignmentStaff) => {
    if (!staff?.user_id?._id) return;
    setSelectedStaff(staff);
    form.setValue("assigned_user_id", staff.user_id._id, { shouldValidate: true });
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!regionId || !selectedDepartment || !selectedStaff || optionsError || staffs.isError ||
      !staffOptions.some(staff => staff.user_id._id === data.assigned_user_id)) {
      form.setError("assigned_user_id", { message: "Choose a department and a staff member from that department" });
      return;
    }
    const newTask = {
      task_name: data.task_name,
      task_description: data.task_description,
      tags: taskTags.getTags(),
      priority: data.priority || undefined,
      comments: data.comments || undefined,
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
        taskTags.reset();
        form.reset({
          task_name: "",
          task_description: "",
          priority: "",
          comments: "",
          assigned_user_id: "",
          status: "To Do",
          business_id: businessData?._id || "",
        });
        setSelectedDepartment(null);
        setRegionId("");
        setAreaId("");
        setLocationId("");
        setSelectedStaff(null);
        setDepartmentSearch("");
        setStaffSearch("");
        router.push(`/admin/tasks/${response?.data?.data?._id}`);
      } else {
        toast.error(response?.data?.message || "Failed to add task");
      }
    } catch (error) {
      toast.error("An error occurred while adding the task");
      console.error("Error adding task:", error);
    }
  };


  const departmentSearchTerm = departmentSearch.trim().toLowerCase();
  const filteredDepartments = (assignmentOptions?.departments || []).filter(department =>
    `${department.dep_name} ${department.scope}`.toLowerCase().includes(departmentSearchTerm));

  const staffSearchTerm = staffSearch.trim().toLowerCase();
  const filteredStaffs = staffOptions.filter(staff => {
    const name = staff?.user_id?.name || "";
    const email = staff?.user_id?.email || "";
    const phone = staff?.user_id?.phone || "";
    return `${name} ${email} ${phone}`.toLowerCase().includes(staffSearchTerm);
  });

  return (
    <div className="p-4 sm:p-6 min-h-screen space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push("/admin/tasks")}>
              Manage Tasks
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Task</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 p-5">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/70">
              Create Task
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">
              Assign a task
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Create the task here & make the task activities after.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <Sparkles size={14} />
            Individual Task
          </div>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Task Details
                  </p>
                  <p className="text-sm text-slate-300">
                    Give the task a name and clear context.
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">* Required fields</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Task Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Name to identify the task"
                          {...field}
                          className="bg-slate-950/40 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task_description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Task Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a short brief, expected outcome, or context."
                          {...field}
                          className="min-h-[120px] bg-slate-950/40 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TaskTagsInput input={taskTags} className="md:col-span-2" />

                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Comments
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional notes, dependencies, or special instructions."
                          {...field}
                          className="min-h-[100px] bg-slate-950/40 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Status
                </p>
                <p className="text-sm text-slate-300">
                  The timeline will be calculated after you add activities.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">


                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Status
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-slate-800/80 bg-slate-950/40 text-slate-100 p-2 focus:border-emerald-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          {TASK_STATUS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
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
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Priority
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-slate-800/80 bg-slate-950/40 text-slate-100 p-2 focus:border-emerald-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          <option value="">No priority</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="normal">Normal</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Assignment
                  </p>
                  <p className="text-sm text-slate-300">
                    Select a region and department, then choose a staff member.
                  </p>
                </div>
                <span className="text-[11px] text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-full">
                  2 steps
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Step 1
                      </p>
                      <p className="text-sm text-slate-200">Choose a department</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {selectedDepartment?.dep_name || "No department selected"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="task-region" className="text-xs text-slate-300">Region *</label>
                      <select
                        id="task-region"
                        value={regionId}
                        onChange={(event) => {
                          setRegionId(event.target.value);
                          setAreaId("");
                          setLocationId("");
                          clearAssignment();
                        }}
                        disabled={!businessData?._id || regions.isPending}
                        className="w-full rounded-md border border-slate-800/80 bg-slate-950 text-slate-100 p-2 text-sm"
                      >
                        <option value="">Select region</option>
                        {regions.data?.map(region => <option key={region._id} value={region._id}>{region.region_name}</option>)}
                      </select>
                    </div>
                    {regionId && (
                      <div className="space-y-1">
                        <label htmlFor="task-area" className="text-xs text-slate-300">Area (optional)</label>
                        <select
                          id="task-area"
                          value={areaId}
                          onChange={(event) => {
                            setAreaId(event.target.value);
                            setLocationId("");
                            clearAssignment();
                          }}
                          disabled={loadingOptions || optionsError}
                          className="w-full rounded-md border border-slate-800/80 bg-slate-950 text-slate-100 p-2 text-sm"
                        >
                          <option value="">All areas</option>
                          {assignmentOptions?.areas.map(area => <option key={area._id} value={area._id}>{area.area_name}</option>)}
                        </select>
                      </div>
                    )}
                    {areaId && (
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="task-location" className="text-xs text-slate-300">Location (optional)</label>
                        <select
                          id="task-location"
                          value={locationId}
                          onChange={(event) => {
                            setLocationId(event.target.value);
                            clearAssignment();
                          }}
                          disabled={loadingOptions || optionsError}
                          className="w-full rounded-md border border-slate-800/80 bg-slate-950 text-slate-100 p-2 text-sm"
                        >
                          <option value="">All locations</option>
                          {assignmentOptions?.locations.map(location => <option key={location._id} value={location._id}>{location.location_name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  {regionId && (
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <Input
                        aria-label="Search departments"
                        placeholder="Search departments..."
                        value={departmentSearch}
                        onChange={(event) => setDepartmentSearch(event.target.value)}
                        className="pl-9 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  )}
                  <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2">
                    {loadingOptions ? (
                      <div className="h-[120px] flex items-center justify-center"><LoaderSpin size={22} /></div>
                    ) : optionsError ? (
                      <div role="alert" className="text-xs text-red-300 space-y-2">
                        <p>Unable to load departments and locations.</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void (regions.isError ? regions.refetch() : options.refetch())}>Retry</Button>
                      </div>
                    ) : !regionId ? (
                      <p className="text-xs text-slate-500">Select a region to see its departments. Area and location are optional.</p>
                    ) : filteredDepartments.length === 0 ? (
                      <p className="text-xs text-slate-500">No departments found for this selection. Try a different filter or search.</p>
                    ) : filteredDepartments.map(department => (
                      <button
                        key={`${department.kind}:${department._id}`}
                        type="button"
                        aria-pressed={selectedDepartment?._id === department._id && selectedDepartment?.kind === department.kind}
                        onClick={() => handleSelectDepartment(department)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                          selectedDepartment?._id === department._id && selectedDepartment?.kind === department.kind
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-800/80 bg-slate-950/50 text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{department.dep_name}</span>
                          {selectedDepartment?._id === department._id && selectedDepartment?.kind === department.kind && <Check size={14} className="text-emerald-300" />}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{department.scope}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`rounded-xl border border-slate-800/70 bg-slate-900/40 p-4 space-y-3 ${
                    !selectedDepartment ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Step 2
                      </p>
                      <p className="text-sm text-slate-200">Select staff</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {selectedStaff?.user_id?.name || "No staff selected"}
                    </span>
                  </div>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <Input
                      placeholder={
                        selectedDepartment ? "Search staff by name, email, or phone..." : "Select a department first"
                      }
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      disabled={!selectedDepartment}
                      className="pl-9 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
                    />
                  </div>
                  <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3">
                    {!selectedDepartment && (
                      <p className="text-xs text-slate-500">
                        Select a department to see its staff members.
                      </p>
                    )}
                    {selectedDepartment && loadingStaffs && (
                      <div className="h-[120px] flex items-center justify-center">
                        <LoaderSpin size={22} />
                      </div>
                    )}
                    {selectedDepartment && staffs.isError && (
                      <div role="alert" className="text-xs text-red-300 space-y-2">
                        <p>Unable to load staff for this department.</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void staffs.refetch()}>Retry</Button>
                      </div>
                    )}
                    {selectedDepartment && !staffs.isError && !loadingStaffs && filteredStaffs.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No staff found for this department.
                      </p>
                    )}
                    {selectedDepartment &&
                      !staffs.isError && !loadingStaffs &&
                      filteredStaffs.map(staff => {
                        const staffName = staff?.user_id?.name || "Unknown";
                        const staffEmail = staff?.user_id?.email || "No email";
                        const staffPhone = staff?.user_id?.phone || "No phone";
                        const taskCount = staff?.task_count ?? 0;
                        const activityCount = staff?.activity_count ?? 0;
                        const isSelected = selectedStaff?.user_id?._id === staff?.user_id?._id;
                        return (
                          <button
                            key={staff?._id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleSelectStaff(staff)}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-emerald-500/60 bg-emerald-500/10"
                                : "border-slate-800/80 bg-slate-950/50 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={staff?.user_id?.avatar_url || "/avatar.png"}
                                size={34}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-100">
                                    {staffName}
                                  </p>
                                  {isSelected && (
                                    <Check size={14} className="text-emerald-300" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">{staffEmail}</p>
                                <p className="text-[11px] text-slate-500">{staffPhone}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                              <span className="rounded-full border border-slate-800/80 bg-slate-950/60 px-2 py-1">
                                Tasks: {taskCount}
                              </span>
                              <span className="rounded-full border border-slate-800/80 bg-slate-950/60 px-2 py-1">
                                Activities: {activityCount}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="assigned_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Assigned Staff *
                      </FormLabel>
                      <FormControl>
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                          <input type="hidden" {...field} />
                          {selectedStaff ? (
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={selectedStaff?.user_id?.avatar_url || "/avatar.png"}
                                size={36}
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-100">
                                  {selectedStaff?.user_id?.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {selectedStaff?.user_id?.email}
                                </p>
                              </div>
                              <div className="ml-auto text-right text-[11px] text-slate-400">
                                <p>Tasks: {selectedStaff?.task_count ?? 0}</p>
                                <p>Activities: {selectedStaff?.activity_count ?? 0}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              Select a staff member to assign this task.
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-200 font-medium">Confirm Task Creation?</p>
                <p className="text-xs text-slate-400">
                  The selected staff will get notified about this task.
                </p>
              </div>
              <Button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-md text-slate-950 text-sm font-semibold"
                disabled={addingTask || loadingOptions || loadingStaffs || !regionId || !selectedDepartment || !selectedStaff || optionsError || staffs.isError}
              >
                {addingTask ? "Saving..." : "Add Task"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddTask;
