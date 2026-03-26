"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

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

  const filteredUsers = useMemo(() => {
    if (!view_users?.users) return [];
    if (!search.trim()) return view_users.users;

    return view_users.users.filter((u: any) =>
      u?.user_id?.name?.toLowerCase().includes(search.toLowerCase())
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

  const toggleUser = (id: string) => {
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
    <div className="p-5 pb-10">
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

      <div className="space-y-5 p-5 text-slate-200">
        <h1 className="text-xl font-bold">Escalate Enquiry</h1>

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Enquiry View Access</h2>
          <h1 className="mb-2 text-sm font-semibold">
            Search & Select Users ({selectedUsers.length})
          </h1>

          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />

          <div className="flex w-full flex-row overflow-y-auto pr-1">
            {filteredUsers?.map((user: any) => (
              <div className="w-1/4 p-1" key={user._id}>
                <div
                  onClick={() => toggleUser(user?.user_id?._id)}
                  className={`relative cursor-pointer rounded border p-2 ${
                    selectedUsers.includes(user?.user_id?._id)
                      ? "border-slate-500 bg-slate-700"
                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <p className="text-sm font-medium">{user?.user_id?.name}</p>
                  <p className="text-xs text-slate-400">{user?.user_id?.email}</p>
                  {selectedUsers.includes(user?.user_id?._id) && (
                    <CheckCircle2
                      size={20}
                      className="absolute right-2 top-2 text-green-500"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Assign To</h2>
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

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Priority</h2>
          <Select value={priority} onValueChange={setPriority}>
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

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Action</h2>
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

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Next Action Date
          </h2>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-200 outline-none transition focus:border-cyan-500"
          />
        </div>

        <div className="rounded-lg bg-slate-900/40 p-4">
          <h2 className="mb-2 text-sm font-semibold">Feedback</h2>
          <textarea
            className="min-h-[100px] w-full rounded bg-slate-800 p-2 text-sm"
            placeholder="Enter feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Button
            className="w-full py-3 text-md"
            onClick={handleSubmit}
            disabled={
              isPending ||
              !priority ||
              (!assignedUsers.length && !assignedAgents.length) ||
              !action
            }
          >
            Submit Escalation
          </Button>

          <Button
            onClick={() =>
              router.push(
                `/admin/projects/add?enquiry_id=${encodeURIComponent(enquiry_id)}`
              )
            }
          >
            Convert to Project
          </Button>

          <Button
            className="bg-red-600"
            onClick={() => setClosureModal(true)}
            variant="outline"
          >
            Close Enquiry
          </Button>
        </div>
      </div>

      <Dialog open={closureModal} onOpenChange={setClosureModal}>
        <DialogContent className="border border-slate-700 bg-slate-900 text-slate-200">
          <DialogHeader>
            <DialogTitle>Close Enquiry</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400">
              Please Provide Feedback on Enquiry Closure
            </label>
            <Textarea
              onChange={(e) => setClosureFeedback(e.target.value)}
              placeholder="Feedback..."
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
