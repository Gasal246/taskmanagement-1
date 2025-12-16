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
import { useCloseEqnuiry, useForwardEnquiryByStaff, useGetEqUsers } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// -------------------------------------------------------

export default function EscalatePage() {
  const router = useRouter();

  const { enquiry_id } = useParams();
  const [business_id, setBusiness_id] = useState("");
  const [user_type, setUser_type] = useState("users");
  const { data: users, isLoading } = useGetEqUsers(business_id, user_type);
  const { data: view_users, isLoading:isViewUsersLoading } = useGetEqUsers(business_id, "users");
  const {mutateAsync: ForwardEnquiry, isPending} = useForwardEnquiryByStaff();
  const { mutateAsync: CloseEnquiry, isPending: isClosing } = useCloseEqnuiry();

  // Form state
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState(""); // Visit or Call
  const [feedback, setFeedback] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [closureFeedback, setClosureFeedback] = useState("");
  const [closureModal, setClosureModal] = useState(false);

  const fetchBusinessId = () => {
    const domainCookie = Cookies.get("user_role");
    if(!domainCookie) return toast.error("Cookies not available");
    const domainJson = JSON.parse(domainCookie);
    setBusiness_id(domainJson?.business_id);
  }

  useEffect(()=> {
    fetchBusinessId()
  }, []);

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

      useEffect(()=> {
      console.log("users: ", users);
    }, [users]);

  // -------------------------------------------------------
  // SUBMIT (SHOW SAMPLE OUTPUT)
  // -------------------------------------------------------
  const handleSubmit = async() => {
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

    const res = await ForwardEnquiry(finalPayload);
    if(res?.status == 201){
      toast.success(res?.message || "Enquiry Forwarded");
      return router.replace(`/enquiry/enquiries`);
    }
    return toast.error(res?.message || "Failed to forward enquiry");
    
  };

    const handleCloseEnquiry = async() => {
      const payload = {
        enquiry_id: enquiry_id,
        feedback: closureFeedback
      };
  
      const res = await CloseEnquiry(payload);
      if(res?.status == 200){
        toast.success(res?.message || "Closed");
        return router.replace(`/enquiry/enquiries/${enquiry_id}`)
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
                        <BreadcrumbLink onClick={() => router.replace("/enquiry/enquiries")}>Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={()=> router.replace(`/enquiry/enquiries/${enquiry_id}`)}>Enquiry Details</BreadcrumbLink>
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
        <h2 className="font-semibold mb-2 text-sm">Search & Select Users</h2>

        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {filteredUsers?.map((user: any) => (
            <div
              key={user._id}
              onClick={() => toggleUser(user?.user_id._id)}
              className={`p-2 rounded cursor-pointer border ${selectedUsers.includes(user?.user_id._id)
                  ? "bg-slate-700 border-slate-500"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
                }`}
            >
              <p className="text-sm font-medium">{user?.user_id?.name}</p>
              <p className="text-xs text-slate-400">{user?.user_id?.email}</p>
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
       <div className="flex items-center gap-2">
        <Button
          className="w-full py-3 text-md"
          onClick={handleSubmit}
          disabled={!priority || !assignedTo || !action}
        >
          Submit Escalation
        </Button>

        <Button
          className="bg-red-600 text-white hover:bg-red-700"
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
    </div>
  );
}
