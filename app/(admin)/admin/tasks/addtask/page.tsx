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
import {
  useAddBusinessTask,
  useGetBusinessSkills,
  useGetBusinessStaffsBySkill,
} from "@/query/business/queries";
import { TASK_STATUS } from "@/lib/constants";
import { Check, Search, Sparkles } from "lucide-react";
import LoaderSpin from "@/components/shared/LoaderSpin";
import { Avatar } from "antd";

const AddTask = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const { mutateAsync: getSkills, isPending: loadingSkills } = useGetBusinessSkills();
  const { mutateAsync: getStaffsBySkill, isPending: loadingStaffsBySkill } =
    useGetBusinessStaffsBySkill();

  const [skills, setSkills] = useState<any[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const formSchema = z.object({
    task_name: z.string().min(1, "Task name is required"),
    task_description: z.string().optional(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    assigned_user_id: z.string().min(1, "Assigned user is required"),
    status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]),
    business_id: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: "",
      task_description: "",
      start_date: "",
      end_date: "",
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
    if (!businessData?._id) return;
    const fetchSkills = async () => {
      const res = await getSkills(businessData._id);
      if (res?.status === 200) {
        setSkills(res?.data || []);
      } else {
        setSkills([]);
      }
    };
    fetchSkills();
  }, [businessData?._id, getSkills]);

  useEffect(() => {
    if (!selectedSkill?._id || !businessData?._id) {
      setStaffOptions([]);
      return;
    }
    const fetchStaffs = async () => {
      const res = await getStaffsBySkill({
        business_id: businessData._id,
        skill_id: selectedSkill._id,
      });
      if (res?.status === 200) {
        setStaffOptions(res?.data || []);
      } else {
        setStaffOptions([]);
      }
    };
    fetchStaffs();
  }, [selectedSkill?._id, businessData?._id, getStaffsBySkill]);

  const handleSelectSkill = (skill: any) => {
    setSelectedSkill(skill);
    setSkillSearch("");
    setStaffSearch("");
    setSelectedStaff(null);
    setStaffOptions([]);
    form.setValue("assigned_user_id", "", { shouldValidate: true });
  };

  const handleSelectStaff = (staff: any) => {
    if (!staff?.user_id?._id) return;
    setSelectedStaff(staff);
    form.setValue("assigned_user_id", staff.user_id._id, { shouldValidate: true });
  };

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const newTask = {
      task_name: data.task_name,
      task_description: data.task_description,
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
        form.reset({
          task_name: "",
          task_description: "",
          start_date: "",
          end_date: "",
          assigned_user_id: "",
          status: "To Do",
          business_id: businessData?._id || "",
        });
        setSelectedSkill(null);
        setSelectedStaff(null);
        setSkillSearch("");
        setStaffSearch("");
        setStaffOptions([]);
        router.push(`/admin/tasks/${response?.data?.data?._id}`);
      } else {
        toast.error(response?.data?.message || "Failed to add task");
      }
    } catch (error) {
      toast.error("An error occurred while adding the task");
      console.error("Error adding task:", error);
    }
  };

  const skillSearchTerm = skillSearch.trim().toLowerCase();
  const filteredSkills = skills.filter((skill: any) => {
    const name = skill?.skill_name || "";
    return name.toLowerCase().includes(skillSearchTerm);
  });

  const staffSearchTerm = staffSearch.trim().toLowerCase();
  const filteredStaffs = staffOptions.filter((staff: any) => {
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
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Schedule
                </p>
                <p className="text-sm text-slate-300">
                  Set a timeline and status for this task.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        Start Date *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-slate-950/40 text-slate-100 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                      <FormLabel className="text-xs text-slate-300 font-semibold">
                        End Date *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-slate-950/40 text-slate-100 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    Select a skill first, then choose the right staff member.
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
                      <p className="text-sm text-slate-200">Choose a skill</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {selectedSkill?.skill_name || "No skill selected"}
                    </span>
                  </div>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <Input
                      placeholder="Search skills..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="pl-9 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                    {loadingSkills && (
                      <div className="h-[120px] flex items-center justify-center">
                        <LoaderSpin size={22} />
                      </div>
                    )}
                    {!loadingSkills && filteredSkills.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No skills found. Try a different search term.
                      </p>
                    )}
                    {!loadingSkills &&
                      filteredSkills.map((skill: any) => (
                        <button
                          key={skill?._id}
                          type="button"
                          onClick={() => handleSelectSkill(skill)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                            selectedSkill?._id === skill?._id
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                              : "border-slate-800/80 bg-slate-950/50 text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{skill?.skill_name}</span>
                            {selectedSkill?._id === skill?._id && (
                              <Check size={14} className="text-emerald-300" />
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                <div
                  className={`rounded-xl border border-slate-800/70 bg-slate-900/40 p-4 space-y-3 ${
                    !selectedSkill ? "opacity-60" : ""
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
                        selectedSkill ? "Search staff by name, email, or phone..." : "Select a skill first"
                      }
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      disabled={!selectedSkill}
                      className="pl-9 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 border-slate-800/80 focus:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
                    />
                  </div>
                  <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3">
                    {!selectedSkill && (
                      <p className="text-xs text-slate-500">
                        Select a skill to see matching staff members.
                      </p>
                    )}
                    {selectedSkill && loadingStaffsBySkill && (
                      <div className="h-[120px] flex items-center justify-center">
                        <LoaderSpin size={22} />
                      </div>
                    )}
                    {selectedSkill && !loadingStaffsBySkill && filteredStaffs.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No staff found for this skill.
                      </p>
                    )}
                    {selectedSkill &&
                      !loadingStaffsBySkill &&
                      filteredStaffs.map((staff: any) => {
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
                disabled={addingTask || loadingSkills || loadingStaffsBySkill}
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
