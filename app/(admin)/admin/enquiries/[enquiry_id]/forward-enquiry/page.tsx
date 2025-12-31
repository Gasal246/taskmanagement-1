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
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { z } from "zod";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl, FormField, FormLabel } from "@/components/ui/form";
import FormItem from "antd/es/form/FormItem";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "antd";
import { DEPARTMENT_TYPES } from "@/lib/constants";
import { useGetBusinessClients, useGetBusinessRegions } from "@/query/business/queries";
import { CheckCircle2 } from "lucide-react";

// -------------------------------------------------------

export default function EscalatePage() {
  const router = useRouter();
  const [user_type, setUser_type] = useState("users");
  const { enquiry_id } = useParams();

  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: users, isLoading } = useGetEqUsers(businessData?._id, user_type);
  const { data: view_users, isLoading: isViewUsersLoading } = useGetEqUsers(businessData?._id, "users");

  const { mutateAsync: getBusinessClients, isPending: loadingBusinessClients } = useGetBusinessClients();
  const { mutateAsync: getRegions, isPending: isRegionLoading } = useGetBusinessRegions();
  const { mutateAsync: ForwardEnquiry, isPending } = useForwardHistory();
  const { mutateAsync: ConvertEnquiry, isPending: isConverting} = useEnquiryToProject();
  const { mutateAsync: CloseEnquiry, isPending: isClosing } = useCloseEqnuiry();

  // Form state
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState(""); // Visit or Call
  const [feedback, setFeedback] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [businessClients, setBusinessClients] = React.useState<any[]>([]);
  const [businessRegions, setBusinessRegions] = useState<any[]>([]);
  const [closureFeedback, setClosureFeedback] = useState("");
  const [closureModal, setClosureModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const newProjectSchema = z.object({
    project_description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().optional(),
    type: z.string(),
    client_id: z.string().nullable().optional(),
    business_id: z.string(),
    region_id: z.string().optional(),
    enquiry_id: z.string()
  })

  const form = useForm({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      project_description: "",
      start_date: "",
      end_date: "",
      type: "",
      client_id: "",
      business_id: businessData?._id,
      region_id: "",
      enquiry_id: enquiry_id
    }
  })

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
  }, [search, users]);

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

  // -------------------------------------------------------
  // SUBMIT (SHOW SAMPLE OUTPUT)
  // -------------------------------------------------------
  const handleSubmit = async () => {
    const finalPayload = {
      enquiry_id,
      users: selectedUsers,
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
    console.log("submit data: ", data);

    const res = await ConvertEnquiry(data);
    if(res?.status == 200){
      toast.success(res?.message || "Operation Success");
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

          <div className="flex items-center gap-6 m-3">

            {/* USER */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="user"
                checked={user_type === "users"}
                onChange={() => setUser_type("users")}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-200">User</span>
            </label>

            {/* AGENT */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="agent"
                checked={user_type === "agents"}
                onChange={() => setUser_type("agents")}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-200">Agent</span>
            </label>
          </div>

          {user_type === "users" && (
            <Select
              value={assignedTo === "" ? undefined : assignedTo}
              onValueChange={(v) => setAssignedTo(v)}
            >
              <SelectTrigger className="text-slate-200">
                <SelectValue placeholder="Select user to assign" />
              </SelectTrigger>

              <SelectContent>
                {users?.users?.map((u: any) => (
                  <SelectItem key={u?.user_id?._id} value={u?.user_id?._id}>
                    {u?.user_id?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {user_type === "agents" && (
            <Select
              value={assignedTo === "" ? undefined : assignedTo}
              onValueChange={(v) => setAssignedTo(v)}
            >
              <SelectTrigger className="text-slate-200">
                <SelectValue placeholder="Select agent to assign" />
              </SelectTrigger>

              <SelectContent>
                {users?.agents?.map((u: any) => (
                  <SelectItem key={u?._id} value={u?._id}>
                    {u?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
            disabled={!priority || !assignedTo || !action}
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
      <FormProvider {...form}>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
            <DialogHeader>
              <DialogTitle>Confirmation</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleConvertToProject)}>

              <FormField
                control={form.control}
                name="project_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-slate-400 font-semibold">Project Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description"
                        {...field}
                        className="text-slate-200" />
                    </FormControl>
                  </FormItem>
                )} />


              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Project Start Date</label>
                <Input type="date" {...form.register("start_date")} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Project End Date</label>
                <Input type="date" {...form.register("end_date")} />
              </div>

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Type</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Project Type" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_TYPES.map((t, i) => (
                          <SelectItem key={i} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Client</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Client" /></SelectTrigger>
                      <SelectContent>
                        {businessClients.map((c) => (
                          <SelectItem key={c._id} value={c._id}>{c.client_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="region_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-300 font-semibold">Project Region</FormLabel>
                  <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-slate-200"><SelectValue placeholder="Select Region" /></SelectTrigger>
                      <SelectContent>
                        {businessRegions.map((r) => (
                          <SelectItem key={r._id} value={r._id}>{r.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )} />
              

              <p className="text-red-400 font-semibold">This action is irreversible.</p>

              <DialogFooter className="mt-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="border border-slate-600"
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
          </DialogContent>
        </Dialog>
      </FormProvider>
    </div>
  );
}
