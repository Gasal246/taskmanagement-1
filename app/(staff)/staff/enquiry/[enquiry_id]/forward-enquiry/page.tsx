"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCloseEqnuiry, useForwardEnquiryByStaff, useGetEnquiryByIdForStaffs, useGetEqUsers } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Cookies from "js-cookie";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CalendarDays, CheckCircle2, Search, Send, ShieldCheck, UserRound, Users } from "lucide-react";

type DirectoryOption = {
  id: string;
  name: string;
  email: string;
};

export default function EscalatePage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();
  const enquiryId = params.enquiry_id;
  const [businessId, setBusinessId] = useState("");
  const [user_type, setUser_type] = useState("users");
  const { data: enquiryData } = useGetEnquiryByIdForStaffs(enquiryId);
  const { data: assigneeDirectory, isLoading: isAssigneeDirectoryLoading } = useGetEqUsers(businessId, user_type);
  const { data: viewUsersData, isLoading: isViewUsersLoading } = useGetEqUsers(businessId, "users");
  const { mutateAsync: ForwardEnquiry, isPending } = useForwardEnquiryByStaff();
  const { mutateAsync: CloseEnquiry, isPending: isClosing } = useCloseEqnuiry();

  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("5");
  const [action, setAction] = useState("Visit");
  const [feedback, setFeedback] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [closureFeedback, setClosureFeedback] = useState("");
  const [closureModal, setClosureModal] = useState(false);

  const fetchBusinessId = () => {
    const domainCookie = Cookies.get("user_domain");
    if (!domainCookie) {
      toast.error("User context is unavailable.");
      return;
    }

    try {
      const domainJson = JSON.parse(domainCookie);
      setBusinessId(domainJson?.business_id || "");
    } catch {
      toast.error("User context is invalid.");
    }
  };

  useEffect(() => {
    fetchBusinessId();
  }, []);

  const availableViewUsers = viewUsersData?.users ?? [];

  const filteredUsers = useMemo(() => {
    if (!availableViewUsers.length) return [];

    if (!search.trim()) return availableViewUsers;

    return availableViewUsers.filter((u: any) => {
      const name = String(u?.user_id?.name || "").toLowerCase();
      const email = String(u?.user_id?.email || "").toLowerCase();
      const term = search.toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [availableViewUsers, search]);

  const assigneeOptions = useMemo<DirectoryOption[]>(() => {
    if (user_type === "agents") {
      return (assigneeDirectory?.agents ?? [])
        .map((agent: any) => {
          if (!agent?._id) return null;
          return {
            id: String(agent._id),
            name: agent?.name || "Unknown Agent",
            email: agent?.email || "",
          };
        })
        .filter(Boolean) as DirectoryOption[];
    }

    return (assigneeDirectory?.users ?? [])
      .map((entry: any) => {
        const user = entry?.user_id;
        if (!user?._id) return null;
        return {
          id: String(user._id),
          name: user?.name || "Unknown User",
          email: user?.email || "",
        };
      })
      .filter(Boolean) as DirectoryOption[];
  }, [assigneeDirectory, user_type]);

  const selectedAssignee = useMemo(
    () => assigneeOptions.find((option) => option.id === assignedTo) || null,
    [assignedTo, assigneeOptions]
  );

  const selectedViewUsers = useMemo(
    () =>
      availableViewUsers
        .filter((entry: any) => selectedUsers.includes(String(entry?.user_id?._id)))
        .map((entry: any) => ({
          id: String(entry?.user_id?._id),
          name: entry?.user_id?.name || "Unknown User",
          email: entry?.user_id?.email || "",
        })),
    [availableViewUsers, selectedUsers]
  );

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    setAssignedTo("");
  }, [user_type]);

  const handleSubmit = async () => {
    if (!assignedTo) {
      toast.error("Select the user or agent responsible for the next step.");
      return;
    }

    if (!priority) {
      toast.error("Select a priority before forwarding.");
      return;
    }

    if (!action) {
      toast.error("Choose the next action.");
      return;
    }

    const finalPayload = {
      enquiry_id: enquiryId,
      users: selectedUsers,
      priority: Number(priority),
      assigned_to: assignedTo,
      action,
      feedback: feedback.trim(),
      is_finished: action === "Finished",
      next_date: nextDate,
    };

    const res = await ForwardEnquiry(finalPayload);
    if (res?.status === 201) {
      toast.success(res?.message || "Enquiry forwarded");
      router.replace(`/staff/enquiry/${enquiryId}/history`);
      return;
    }

    toast.error(res?.message || "Failed to forward enquiry");
  };

  const handleCloseEnquiry = async () => {
    if (!closureFeedback.trim()) {
      toast.error("Add a closure note before closing the enquiry.");
      return;
    }

    const payload = {
      enquiry_id: enquiryId,
      feedback: closureFeedback.trim(),
    };

    const res = await CloseEnquiry(payload);
    if (res?.status === 200) {
      toast.success(res?.message || "Closed");
      router.replace(`/staff/enquiry/${enquiryId}`);
      return;
    } else {
      toast.error(res?.message || "Failed to Close Enquiry");
    }
    setClosureModal(false);
  };

  const enquiryUuid = enquiryData?.enquiry?.enquiry_uuid || enquiryId;
  const campName = enquiryData?.enquiry?.camp_id?.camp_name || "Camp not linked";
  const statusLabel = enquiryData?.enquiry?.status || "Lead Received";
  const selectedCountLabel = `${selectedUsers.length} ${selectedUsers.length === 1 ? "viewer" : "viewers"}`;

  return (
    <div className="p-4 pb-10 text-slate-200">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/staff/enquiry")}>Enquiries</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace(`/staff/enquiry/${enquiryId}`)}>Enquiry Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Forward Enquiry</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mx-auto mt-4 max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))] p-6 shadow-[0_24px_80px_-48px_rgba(34,211,238,0.6)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Send size={14} />
                Forward Workflow
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Forward Enquiry</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Assign the next owner, grant visibility to the right people, and leave a clean handover note.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Enquiry</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{enquiryUuid}</p>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Camp</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{campName}</p>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{statusLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">View Access</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Choose who should be able to track this forwarded enquiry.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  <ShieldCheck size={14} />
                  {selectedCountLabel}
                </div>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search users by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-slate-700 bg-slate-900/70 pl-10 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="mt-4 grid max-h-[22rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {isViewUsersLoading && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
                    Loading available users...
                  </div>
                )}

                {!isViewUsersLoading && filteredUsers.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No users matched this search.
                  </div>
                )}

                {filteredUsers.map((user: any) => {
                  const userId = String(user?.user_id?._id || "");
                  const isSelected = selectedUsers.includes(userId);

                  return (
                    <button
                      key={userId || user?._id}
                      type="button"
                      onClick={() => toggleUser(userId)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-cyan-500/70 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(6,182,212,0.25)]"
                          : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{user?.user_id?.name || "Unknown User"}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{user?.user_id?.email || "No email"}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan-300" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedViewUsers.length > 0 ? (
                  selectedViewUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100"
                    >
                      <Users size={13} />
                      {user.name}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No additional viewers selected yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-white">Ownership</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pick who should take the next action on this enquiry.
                </p>
              </div>

              <div className="mt-4 inline-flex rounded-2xl border border-slate-700 bg-slate-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setUser_type("users")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    user_type === "users" ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Assign User
                </button>
                <button
                  type="button"
                  onClick={() => setUser_type("agents")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    user_type === "agents" ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Assign Agent
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Select Owner</p>
                  <Select
                    value={assignedTo === "" ? undefined : assignedTo}
                    onValueChange={(value) => setAssignedTo(value)}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder={user_type === "users" ? "Select a user" : "Select an agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAssigneeDirectoryLoading && (
                    <p className="mt-2 text-xs text-slate-500">Loading assignable {user_type === "users" ? "users" : "agents"}...</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Owner</p>
                  {selectedAssignee ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-100">{selectedAssignee.name}</p>
                      <p className="text-xs text-slate-400">{selectedAssignee.email || "No email available"}</p>
                      <p className="pt-2 text-xs text-cyan-300">
                        {user_type === "users" ? "Internal user" : "Agent"} will receive the next action.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No owner selected yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-white">Next Step</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Define urgency, action type, target date, and the handover context.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Priority</p>
                  <Select value={priority} onValueChange={(value) => setPriority(value)}>
                    <SelectTrigger className="border-slate-700 bg-slate-900/70 text-slate-100">
                      <SelectValue placeholder="Select priority" />
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

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next Action Date</p>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 pl-10 pr-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action Type</p>
                <div className="flex flex-wrap gap-3">
                  {["Visit", "Call", "Finished"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={action === item ? "default" : "outline"}
                      className={action === item ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400" : "border-slate-700 bg-slate-900/60 text-slate-200"}
                      onClick={() => setAction(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Handover Notes</p>
                <Textarea
                  className="min-h-[140px] border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                  placeholder="Add the latest context, blockers, expected outcome, or anything the next owner should know."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">Forward Summary</h2>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Owner</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {selectedAssignee?.name || "Not selected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedAssignee?.email || "Choose an owner to continue"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Priority</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{priority || "Not set"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Action</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{action || "Not set"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Due Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{nextDate || "No date selected"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Visibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{selectedCountLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Share visibility only with people who need to follow the progress or contribute to the next step.
              </div>

              <div className="mt-5 space-y-3">
                <Button
                  className="w-full gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  <Send size={16} />
                  {isPending ? "Forwarding..." : "Forward Enquiry"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  onClick={() => setClosureModal(true)}
                  disabled={isClosing}
                >
                  <AlertTriangle size={16} />
                  Close Enquiry
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-300 hover:bg-slate-900/70 hover:text-white"
                  onClick={() => router.replace(`/staff/enquiry/${enquiryId}`)}
                >
                  Back to Enquiry
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog open={closureModal} onOpenChange={setClosureModal}>
        <DialogContent className="border border-slate-700 bg-slate-950 text-slate-200">
          <DialogHeader>
            <DialogTitle>Close Enquiry</DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="text-xs font-medium text-slate-400">
              Add a short closure summary so the decision is clear in the record.
            </label>
            <Textarea
              className="mt-3 min-h-[120px] border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
              onChange={(e) => setClosureFeedback(e.target.value)}
              placeholder="Explain why the enquiry is being closed."
              value={closureFeedback}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClosureModal(false)}
            >
              Cancel
            </Button>

            <Button onClick={handleCloseEnquiry} disabled={isClosing}>
              Close Enquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
