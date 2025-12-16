"use client"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RootState } from '@/redux/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import * as z from 'zod';
import { toast } from 'sonner';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useRouter } from 'next/navigation';
import { useAddBusinessTask, useGetAllStaffsForStaff } from '@/query/business/queries';
import { TASK_STATUS } from '@/lib/constants';
import { Search } from 'lucide-react';
import Cookies from 'js-cookie';

const AddTask = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const { mutateAsync: addTask, isPending: addingTask } = useAddBusinessTask();
  const [loadedStaffs, setLoadedStaffs] = useState([]);
  const [businessId, setBusinessId] = useState("");
//   const { data: loadedStaffs, isLoading: loadingStaffData } = useGetBusinessStaffs(businessData?._id);
const { mutateAsync: GetStaffs, isPending: loadingStaffData } = useGetAllStaffsForStaff();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

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

  useEffect(()=> {
    form.setValue("business_id", businessId);
  }, [businessId]);

  const fetchStaffs = async () => {
      const cookieData = Cookies.get("user_role");
      const domainCookie = Cookies.get("user_domain");
      if (!cookieData || !domainCookie) {
        toast.error("Cookie not found");
        return;
      }
  
      try {
        const jsonData = JSON.parse(cookieData);
        const domainJson = JSON.parse(domainCookie);
        setBusinessId(domainJson?.business_id);
        const res = await GetStaffs(jsonData?._id);
        console.log("staff data: ", res?.data);
  
        if (res.status === 200) {
          // Combine all staff arrays and map to a consistent format
          const allStaff = [
            ...(res?.data?.area_heads || []),
            ...(res?.data?.area_staffs || []),
            ...(res?.data?.location_heads || []),
            ...(res?.data?.location_staffs || []),
            ...(res?.data?.region_staffs || []),
            ...(res?.data?.region_department_heads || []),
            ...(res?.data?.region_department_staffs || []),
            ...(res?.data?.area_department_heads || []),
            ...(res?.data?.area_department_staffs || []),
            ...(res?.data?.location_department_heads || []),
            ...(res?.data?.location_department_staffs || [])
          ].map((item) => ({
            _id: item?.staff_id?._id || item?.user_id?._id,
            name: item?.staff_id?.name || item?.user_id?.name,
            email: item?.staff_id?.email || item?.user_id?.email,
            phone: item?.staff_id?.phone || item?.user_id?.phone,
            role: item.role || 'N/A',
            department: item.staff_id?.department || 'N/A', // Adjust based on actual data
            org: item.region_id ? `Region: ${item.region_id.region_name}` : item.area_id ? `Area: ${item.area_id.area_name}` : item.location_id ? `Location: ${item.location_id.location_name}` : "N/A" , // Adjust based on actual region data
          }));
          console.log("formatted staff: ", allStaff);
          
          setLoadedStaffs(allStaff);
        } else {
          toast.error(res?.message || "Failed to fetch staff data");
        }
      } catch (error) {
        toast.error("An error occurred while fetching staff data");
      }
    };
  
    useEffect(() => {
      fetchStaffs();
    }, []);

  useEffect(() => {
    if (loadedStaffs) {
      const filtered = loadedStaffs.filter((user: any) =>
        user?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
      setIsDropdownOpen(searchTerm.length > 0 && filtered.length > 0);
    }
  }, [searchTerm, loadedStaffs]);

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
      project_id: null
    };

    console.log("task data ", newTask);

    try {
      const response = await addTask(newTask);
      if (response?.status === 201) {
        toast.success(response?.data?.message || "Task added successfully");
        form.reset();
        setSearchTerm("");
        setSelectedUser(null);
        setIsDropdownOpen(false);
        router.push(`/staff/tasks/${response?.data?.data?._id}`);
      } else {
        toast.error(response?.data?.message || "Failed to add task");
      }
    } catch (error) {
      toast.error("An error occurred while adding the task");
      console.error("Error adding task:", error);
    }
  };

  const handleUserSelect = (user: any) => {
    if (user) {
      form.setValue("assigned_user_id", user._id);
      setSearchTerm(user.name);
      setSelectedUser(user);
      setIsDropdownOpen(false);
      console.log("selected user: ", user._id);
    }
  };

  return (
    <div className="p-4">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push('/admin/tasks')}>Manage Tasks</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add Task</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-2 bg-gradient-to-tr border-white from-slate-950/60 to-slate-900/60 p-3 rounded-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 flex flex-wrap items-baseline">
            {/* Task Name */}
            <FormField
              control={form.control}
              name="task_name"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Task Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter task name"
                      {...field}
                      className="bg-transparent focus:bg-transparent hover:bg-transparent text-white placeholder:text-slate-400 border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Description */}
            <FormField
              control={form.control}
              name="task_description"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Task Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description"
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
                      className="bg-transparent focus:bg-transparent hover:bg-transparent text-white border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="bg-transparent focus:bg-transparent hover:bg-transparent text-white border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned User */}
            <FormField
              control={form.control}
              name="assigned_user_id"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Assigned User</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="relative mb-2">
                        <Input
                          placeholder="Search for a user..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => {
                            if (filteredUsers.length > 0) setIsDropdownOpen(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setIsDropdownOpen(false), 200);
                          }}
                          className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8"
                          disabled={loadingStaffData}
                        />
                        <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                      </div>
                      {isDropdownOpen && (
                        <div className="max-h-[150px] overflow-y-auto rounded-md bg-slate-900 border border-slate-700 shadow-lg z-10">
                          {filteredUsers.length === 0 && searchTerm !== "" ? (
                            <div className="p-2 text-xs text-slate-400">No users found.</div>
                          ) : (
                            filteredUsers.map((user: any, index) => (
                              <div
                                key={index}
                                className={`p-2 text-xs text-slate-300 cursor-pointer hover:bg-slate-800 ${
                                  selectedUser?._id === user._id ? 'bg-slate-700' : ''
                                }`}
                                onClick={() => handleUserSelect(user)}
                              >
                                {user.name}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {loadingStaffData && (
                        <p className="text-xs text-slate-400 mt-1">Loading users...</p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="w-full lg:w-1/2 p-1">
                  <FormLabel className="text-xs text-slate-300 font-semibold">Task Status</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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

            {/* Submit Button */}
            <div className="w-full flex justify-end mt-4">
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-semibold"
                disabled={addingTask || loadingStaffData}
              >
                {addingTask ? "Saving..." : "Save Task"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddTask;