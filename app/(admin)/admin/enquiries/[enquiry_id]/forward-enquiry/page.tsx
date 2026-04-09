"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import EnquiryUserMultiSelect from "@/components/enquiries/EnquiryUserMultiSelect";
import {
  useCloseEqnuiry,
  useForwardHistory,
  useGetEqUsers,
} from "@/query/enquirymanager/queries";
import { RootState } from "@/redux/store";

type DirectoryOption = {
  id: string;
  name: string;
  email: string;
};

export default function EscalatePage() {
  const router = useRouter();
  const { enquiry_id } = useParams<{ enquiry_id: string }>();

  const { businessData } = useSelector((state: RootState) => state.user);
  const { data: users } = useGetEqUsers(businessData?._id, "users");
  const { data: agents } = useGetEqUsers(businessData?._id, "agents");
  const { data: view_users } = useGetEqUsers(businessData?._id, "users");
  const { mutateAsync: ForwardEnquiry, isPending } = useForwardHistory();
  const { mutateAsync: CloseEnquiry } = useCloseEqnuiry();

  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [priority, setPriority] = useState("");
  const [action, setAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [closureFeedback, setClosureFeedback] = useState("");
  const [closureModal, setClosureModal] = useState(false);

  const availableViewUsers = useMemo(
    () => view_users?.users || [],
    [view_users?.users]
  );

  const filteredUsers = useMemo(() => {
    if (!availableViewUsers.length) return [];
    if (!search.trim()) return availableViewUsers;

    const term = search.toLowerCase();

    return availableViewUsers.filter((u: any) => {
      const name = String(u?.user_id?.name || "").toLowerCase();
      const email = String(u?.user_id?.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [availableViewUsers, search]);

  const assignUserOptions = useMemo<DirectoryOption[]>(() => {
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
      .filter(Boolean) as DirectoryOption[];
  }, [users?.users]);

  const assignAgentOptions = useMemo<DirectoryOption[]>(() => {
    return (agents?.agents || [])
      .map((user: any) => {
        if (!user?._id) return null;
        return {
          id: String(user._id),
          name: user?.name || "Unknown Agent",
          email: user?.email || "",
        };
      })
      .filter(Boolean) as DirectoryOption[];
  }, [agents?.agents]);

  const selectedAssignedUsers = useMemo<DirectoryOption[]>(
    () => assignUserOptions.filter((option) => assignedUsers.includes(option.id)),
    [assignUserOptions, assignedUsers]
  );

  const selectedAssignedAgents = useMemo<DirectoryOption[]>(
    () => assignAgentOptions.filter((option) => assignedAgents.includes(option.id)),
    [assignAgentOptions, assignedAgents]
  );

  const selectedViewUsers = useMemo<DirectoryOption[]>(
    () =>
      availableViewUsers
        .filter((entry: any) =>
          selectedUsers.includes(String(entry?.user_id?._id || ""))
        )
        .map((entry: any) => ({
          id: String(entry?.user_id?._id || ""),
          name: entry?.user_id?.name || "Unknown User",
          email: entry?.user_id?.email || "",
        })),
    [availableViewUsers, selectedUsers]
  );

  const assignedCount = assignedUsers.length + assignedAgents.length;
  const selectedCountLabel = `${selectedUsers.length} ${selectedUsers.length === 1 ? "viewer" : "viewers"}`;
  const assignedCountLabel = `${assignedCount} ${assignedCount === 1 ? "assignee" : "assignees"}`;

  const toggleUser = (id: string) => {
    if (!id) return;

    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const assignedTo = [...assignedUsers, ...assignedAgents].filter(Boolean);
    const accessUsers = Array.from(
      new Set([...selectedUsers, ...assignedTo].filter(Boolean))
    );

    const res = await ForwardEnquiry({
      enquiry_id,
      access_users: accessUsers,
      priority: Number(priority),
      assigned_to: assignedTo,
      action,
      feedback,
      is_finished: action === "Finished",
      next_date: nextDate,
    });

    if (res?.status === 201) {
      toast.success(res?.message || "Enquiry Forwarded");
      router.replace(`/admin/enquiries/${enquiry_id}/history`);
      return;
    }

    toast.error(res?.message || "Failed to forward enquiry");
  };

  const handleCloseEnquiry = async () => {
    const res = await CloseEnquiry({
      enquiry_id,
      feedback: closureFeedback,
    });

    if (res?.status === 200) {
      toast.success(res?.message || "Closed");
      router.replace(`/admin/enquiries/${enquiry_id}`);
      return;
    }

    toast.error(res?.message || "Failed to Close Enquiry");
    setClosureModal(false);
  };

  return (
    <div className="p-4 pb-10 text-slate-200">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")}>
              Enquiries
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => router.replace(`/admin/enquiries/${enquiry_id}`)}
            >
              Enquiry Details
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Forward Enquiry</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mx-auto mt-4 max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))] p-6 shadow-[0_24px_80px_-52px_rgba(45,212,191,0.55)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                <Send size={14} />
                Forward Enquiry
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Admin Forward
                </h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Visibility
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {selectedCountLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Assigned
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {assignedCountLabel}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    View Access
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  <ShieldCheck size={14} />
                  {selectedCountLabel}
                </div>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-slate-700 bg-slate-900/70 pl-10 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="mt-4 grid max-h-[22rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredUsers.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No users found.
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
                          ? "border-emerald-500/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                          : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {user?.user_id?.name || "Unknown User"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {user?.user_id?.email || "No email"}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                        )}
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
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
                    >
                      <Users size={13} />
                      {user.name}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    No viewers selected.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Ownership</h2>
                <span className="text-xs text-slate-500">
                  {assignedCountLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <EnquiryUserMultiSelect
                      label="Users"
                      value={assignedUsers}
                      options={assignUserOptions}
                      onChange={setAssignedUsers}
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <EnquiryUserMultiSelect
                      label="Agents"
                      value={assignedAgents}
                      options={assignAgentOptions}
                      onChange={setAssignedAgents}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected Team
                  </p>

                  {assignedCount > 0 ? (
                    <div className="mt-3 space-y-4">
                      {selectedAssignedUsers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-emerald-300">Users</p>
                          {selectedAssignedUsers.map((user) => (
                            <div key={user.id} className="space-y-1">
                              <p className="text-sm font-semibold text-slate-100">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {user.email || "No email available"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedAssignedAgents.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-emerald-300">Agents</p>
                          {selectedAssignedAgents.map((agent) => (
                            <div key={agent.id} className="space-y-1">
                              <p className="text-sm font-semibold text-slate-100">
                                {agent.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {agent.email || "No email available"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No owner selected yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-white">Next Step</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Priority
                  </p>
                  <Select value={priority} onValueChange={setPriority}>
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Next Date
                  </p>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 pl-10 pr-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Action
                </p>
                <div className="flex flex-wrap gap-3">
                  {["Visit", "Call"].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={action === item ? "default" : "outline"}
                      className={
                        action === item
                          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          : "border-slate-700 bg-slate-900/60 text-slate-200"
                      }
                      onClick={() => setAction(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Feedback
                </p>
                <Textarea
                  className="min-h-[140px] border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                  placeholder="Add feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-emerald-300" />
                <h2 className="text-lg font-semibold text-white">Summary</h2>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Assigned</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {assignedCountLabel}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Priority</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {priority || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Action</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {action || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Next Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {nextDate || "Not set"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-500">Visibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {selectedCountLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Button
                  className="w-full gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  onClick={handleSubmit}
                  disabled={
                    isPending ||
                    !priority ||
                    (!assignedUsers.length && !assignedAgents.length) ||
                    !action
                  }
                >
                  <Send size={16} />
                  {isPending ? "Forwarding..." : "Forward Enquiry"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  onClick={() =>
                    router.push(
                      `/admin/projects/add?enquiry_id=${encodeURIComponent(enquiry_id)}`
                    )
                  }
                >
                  Convert to Project
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  onClick={() => setClosureModal(true)}
                >
                  Close Enquiry
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-300 hover:bg-slate-900/70 hover:text-white"
                  onClick={() => router.replace(`/admin/enquiries/${enquiry_id}`)}
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
            <Textarea
              className="min-h-[120px] border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
              onChange={(e) => setClosureFeedback(e.target.value)}
              placeholder="Add feedback"
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

            <Button onClick={handleCloseEnquiry}>Close Enquiry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
