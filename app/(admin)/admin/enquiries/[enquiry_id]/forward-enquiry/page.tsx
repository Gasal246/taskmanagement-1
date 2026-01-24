"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useCloseEqnuiry, useEnquiryToProject, useForwardHistory, useGetEqUsers } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENT_TYPES } from "@/lib/constants";
import { useGetAreasandDeptsForRegion, useGetBusinessClients, useGetBusinessRegions } from "@/query/business/queries";
import { CheckCircle2 } from "lucide-react";
import EnquiryUserMultiSelect from "@/components/enquiries/EnquiryUserMultiSelect";

// -------------------------------------------------------

export default function EscalatePage() {
  const router = useRouter();
  const { enquiry_id } = useParams();

  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: users } = useGetEqUsers(businessData?._id, "users");
  const { data: agents } = useGetEqUsers(businessData?._id, "agents");
  const { data: view_users } = useGetEqUsers(businessData?._id, "users");

  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: getRegions, isPending: isRegionLoading } = useGetBusinessRegions();
  const { mutateAsync: getAreasForRegion, isPending: loadingAreas } = useGetAreasandDeptsForRegion();
  const { mutateAsync: ForwardEnquiry, isPending } = useForwardHistory();
  const { mutateAsync: ConvertEnquiry, isPending: isConverting} = useEnquiryToProject();
  const { mutateAsync: CloseEnquiry, isPending: isClosing } = useCloseEqnuiry();

  // Form state
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState(""); // Visit or Call
  const [feedback, setFeedback] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [businessClients, setBusinessClients] = React.useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = useState<any[]>([]);
  const [regionAreas, setRegionAreas] = useState<any[]>([]);
  const [closureFeedback, setClosureFeedback] = useState("");
  const [closureModal, setClosureModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const newProjectSchema = z.object({
    project_name: z.string().min(1, "Project name is required"),
    project_description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string(),
    type: z.string(),
    client_id: z.string().nullable().optional(),
    business_id: z.string(),
    priority: z.string().optional(),
    region_id: z.string(),
    area_id: z.string().nullable().optional(),
    enquiry_id: z.string(),
  });

  const form = useForm({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      project_name: "",
      project_description: "",
      start_date: "",
      end_date: "",
      type: "",
      client_id: "",
      business_id: businessData?._id,
      priority: "normal",
      region_id: "",
      area_id: "",
      enquiry_id: enquiry_id,
    },
  });

  const selectedRegionId = form.watch("region_id");

  const handleFetchBusinessClients = async () => {
    const res = await getBusinessClients(businessData?._id);
    console.log("clients: ", res);

    if (res?.status == 200) {
      setBusinessClients(res?.data);
    }
  }

  const handleFetchBusinessRegions = async () => {
    console.log("busdata", businessData);

    const res = await getRegions({ business_id: businessData?._id });
    console.log("regions: ", res);

    if (res?.status == 200) {
      setBusinessRegions(res?.data);
    }
  }

  // -------------------------------------------------------
  // FILTER USERS
  // -------------------------------------------------------
  const filteredUsers = useMemo(() => {
    if (!view_users?.users) return [];

    // No search → show full list
    if (!search.trim()) return view_users.users;

    // With search → filter
    return view_users.users.filter((u: any) =>
      u?.user_id?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, view_users?.users]);

  const assignUserOptions = useMemo(() => {
    return (users?.users || [])
      .map((entry: any) => {
        const user = entry?.user_id;
        if (!user?._id) return null;
        return {
          id: String(user._id),
          name: user?.name || "Unknown User",
          email: user?.email || "",
        };
      })
      .filter(Boolean);
  }, [users?.users]);

  const assignAgentOptions = useMemo(() => {
    return (agents?.agents || [])
      .map((user: any) => {
        if (!user?._id) return null;
        return {
          id: String(user._id),
          name: user?.name || "Unknown Agent",
          email: user?.email || "",
        };
      })
      .filter(Boolean);
  }, [agents?.agents]);

  // -------------------------------------------------------
  // TOGGLE USER SELECTION
  // -------------------------------------------------------
  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    console.log("users: ", users);
  }, [users]);

  useEffect(() => {
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

  // -------------------------------------------------------
  // SUBMIT (SHOW SAMPLE OUTPUT)
  // -------------------------------------------------------
  const handleSubmit = async () => {
    const assignedTo = [...assignedUsers, ...assignedAgents].filter(Boolean);
    const accessUsers = Array.from(
      new Set([...selectedUsers, ...assignedTo].filter(Boolean))
    );
    const finalPayload = {
      enquiry_id,
      access_users: accessUsers,
      priority: Number(priority),
      assigned_to: assignedTo,
      action,
      feedback,
      is_finished: action == "Finished",
      next_date: nextDate
    };

    console.log("data: ", finalPayload);


    const res = await ForwardEnquiry(finalPayload);
    if (res?.status == 201) {
      toast.success(res?.message || "Enquiry Forwarded");
      return router.replace(`/admin/enquiries/${enquiry_id}/history`)
    }
    return toast.error(res?.message || "Failed to forward enquiry");

  };

  const handleConvertToProject = async (data: any) => {
    const payload = {
      ...data,
      enquiry_id,
      business_id: businessData?._id ?? data.business_id,
      client_id: data?.client_id === "" ? null : data?.client_id,
      area_id: data?.area_id === "" ? null : data?.area_id,
    };

    console.log("submit data: ", payload);

    const res = await ConvertEnquiry(payload);
    if(res?.status == 200){
      toast.success(res?.message || "Operation Success");
      setConfirmOpen(false);
      return router.push(`/admin/projects/${res?.project_id}`);
    } else {
      toast.error(res?.message || "Operation Failed");
    }
    setConfirmOpen(false);
    return;
  }

  const handleCloseEnquiry = async() => {
    const payload = {
      enquiry_id: enquiry_id,
      feedback: closureFeedback
    };

    const res = await CloseEnquiry(payload);
    if(res?.status == 200){
      toast.success(res?.message || "Closed");
      return router.replace(`/admin/enquiries/${enquiry_id}`)
    } else {
      toast.error(res?.message || "Failed to Close Enquiry");
    }
    setClosureModal(false);
  }

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
            <BreadcrumbLink onClick={() => router.replace(`/admin/enquiries/${enquiry_id}`)}>Enquiry Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Forward Enquiry</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="p-5 space-y-5 text-slate-200">

        <h1 className="text-xl font-bold">Escalate Enquiry</h1>

        {/* SEARCH USERS */}
        <div className="bg-slate-900/40 p-4 rounded-lg">
        <h2 className="font-semibold mb-2 text-sm">Enquiry View Access</h2>
          <h1 className="font-semibold mb-2 text-sm">Search & Select Users ({selectedUsers.length})</h1>

          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />

          <div className="overflow-y-auto pr-1 w-full flex flex-row">
            {filteredUsers?.map((user: any) => (
              <div className="p-1 w-1/4" key={user._id}> 
              <div
                onClick={() => toggleUser(user?.user_id._id)}
                className={`relative p-2 rounded cursor-pointer border ${selectedUsers.includes(user?.user_id._id)
                  ? "bg-slate-700 border-slate-500"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
                  }`}
              >
                <p className="text-sm font-medium">{user?.user_id?.name}</p>
                <p className="text-xs text-slate-400">{user?.user_id?.email}</p>
                {selectedUsers.includes(user?.user_id._id) && <CheckCircle2 size={20} className="text-green-500 absolute top-2 right-2" />}
              </div>
              </div>
            ))}
          </div>
        </div>


        {/* ASSIGNED TO */}

        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm">Assign To</h2>
          <div className="space-y-3">
            <EnquiryUserMultiSelect
              label="Users"
              value={assignedUsers}
              options={assignUserOptions}
              onChange={setAssignedUsers}
            />
            <EnquiryUserMultiSelect
              label="Agents"
              value={assignedAgents}
              options={assignAgentOptions}
              onChange={setAssignedAgents}
            />
          </div>
        </div>


        {/* PRIORITY */}
        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm">Priority</h2>

          <Select value={priority} onValueChange={(v) => setPriority(v)}>
            <SelectTrigger className="text-slate-200">
              <SelectValue placeholder="Select Priority" />
            </SelectTrigger>

            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {/* ACTION */}
        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm">Action</h2>

          <div className="flex gap-3">
            <Button
              variant={action === "Visit" ? "default" : "outline"}
              onClick={() => setAction("Visit")}
            >
              Visit
            </Button>

            <Button
              variant={action === "Call" ? "default" : "outline"}
              onClick={() => setAction("Call")}
            >
              Call
            </Button>
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm text-slate-300">Next Action Date</h2>

          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-slate-200 focus:border-cyan-500 outline-none transition"
          />
        </div>

        {/* FEEDBACK */}
        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm">Feedback</h2>

          <textarea
            className="w-full bg-slate-800 rounded p-2 min-h-[100px] text-sm"
            placeholder="Enter feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        {/* SUBMIT */}
        <div className="flex flex-col gap-1">
          <Button
            className="w-full py-3 text-md"
            onClick={handleSubmit}
            disabled={!priority || (!assignedUsers.length && !assignedAgents.length) || !action}
          >
            Submit Escalation
          </Button>


          <Button onClick={() => setConfirmOpen(true)}>
            Convert to Project
          </Button>

          <Button
          className="bg-red-600"
          onClick={()=> setClosureModal(true)}
          variant="outline">
            Close Enquiry
            
          </Button>
        </div>

      </div>

      <Dialog open={closureModal} onOpenChange={setClosureModal}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Close Enquiry</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Please Provide Feedback on Enquiry Closure</label>
              <Textarea onChange={(e)=> setClosureFeedback(e.target.value)} placeholder="Feedback..." />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={()=> setClosureModal(false)}>Cancel
            </Button>

            <Button
              onClick={handleCloseEnquiry}
            >
              Close Enquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 max-w-4xl">
          <DialogHeader>
            <DialogTitle>Convert Enquiry to Project</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fill in the project details to continue.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConvertToProject)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="project_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Project Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter project name"
                          {...field}
                          className="border-slate-700 bg-slate-900 text-slate-100"
                        />
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
                      <FormLabel className="text-xs text-slate-300 font-semibold">Project Priority</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  name="project_description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs text-slate-300 font-semibold">Project Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter project description"
                          {...field}
                          className="border-slate-700 bg-slate-900 text-slate-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          className="border-slate-700 bg-slate-900 text-slate-100"
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
                          className="border-slate-700 bg-slate-900 text-slate-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300 font-semibold">Project Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 text-white p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          <option disabled value="">
                            Select Type
                          </option>
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
                  name="region_id"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormItem>
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

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
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
              </div>

              <p className="text-xs text-red-400 font-semibold">This action is irreversible.</p>

              <DialogFooter className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="border border-slate-700"
                >
                  Cancel
                </Button>

                <Button
                  className="bg-cyan-700 hover:bg-cyan-600"
                  type="submit"
                >
                  Proceed
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
