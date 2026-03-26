"use client";

import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetEqUsers } from "@/query/enquirymanager/queries";

type EnquiryUserFilterFieldProps = {
  label: string;
  businessId: string;
  selectedUserId: string;
  selectedUserName: string;
  onSelect: (user: { id: string; name: string }) => void;
  onClear: () => void;
};

export default function EnquiryUserFilterField({
  label,
  businessId,
  selectedUserId,
  selectedUserName,
  onSelect,
  onClear,
}: EnquiryUserFilterFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: usersData, isLoading } = useGetEqUsers(businessId, "users");

  const users = useMemo(
    () =>
      (usersData?.users ?? [])
        .map((entry: any) => {
          const user = entry?.user_id;
          if (!user?._id) return null;
          return {
            id: String(user._id),
            name: user?.name || "Unknown User",
            email: user?.email || "",
          };
        })
        .filter(Boolean),
    [usersData?.users]
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.trim().toLowerCase();
    return users.filter((user: any) =>
      `${user?.name || ""} ${user?.email || ""}`.toLowerCase().includes(term)
    );
  }, [search, users]);

  const handleSelect = (user: { id: string; name: string }) => {
    onSelect(user);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="w-full lg:w-1/4 p-1">
      <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400 block">{label}</Label>
          {selectedUserId && (
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-1 py-0 text-[11px] text-slate-400 hover:text-slate-100"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between border-slate-700 bg-slate-950/40 ${selectedUserId ? "text-slate-100" : "text-slate-400"}`}
          onClick={() => setOpen(true)}
        >
          <span className="truncate">{selectedUserName || `Select ${label}`}</span>
          <Search size={14} />
        </Button>

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setSearch("");
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
              <DialogDescription>
                Search enquiry users and select one to apply this filter.
              </DialogDescription>
            </DialogHeader>

            <Input
              placeholder="Search users by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-[360px] overflow-y-auto rounded-md border border-slate-800">
              {isLoading && (
                <div className="p-4 text-sm text-slate-400">Loading enquiry users...</div>
              )}

              {!isLoading && filteredUsers.length === 0 && (
                <div className="p-4 text-sm text-slate-400">No users found.</div>
              )}

              {!isLoading &&
                filteredUsers.map((user: any) => {
                  const isSelected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 text-left last:border-b-0 hover:bg-slate-900/60"
                      onClick={() => handleSelect(user)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
                        <p className="truncate text-xs text-slate-400">{user.email || "No email"}</p>
                      </div>
                      {isSelected && <Check size={16} className="mt-0.5 shrink-0 text-cyan-300" />}
                    </button>
                  );
                })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
