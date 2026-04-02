"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

type EnquiryUserOption = {
  id: string;
  name: string;
  email?: string;
};

type EnquiryUserMultiSelectProps = {
  label: string;
  value: string[];
  options: EnquiryUserOption[];
  onChange: (value: string[]) => void;
};

export default function EnquiryUserMultiSelect({
  label,
  value,
  options,
  onChange,
}: EnquiryUserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftSelection, setDraftSelection] = useState<string[]>([]);

  const safeValue = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  useEffect(() => {
    if (open) {
      setDraftSelection([...safeValue]);
      setSearch("");
    }
  }, [open, safeValue]);

  const selectedUsers = useMemo(() => {
    const optionMap = new Map(options.map((option) => [option.id, option]));
    return safeValue.map((id) => optionMap.get(id) || { id, name: id });
  }, [options, safeValue]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      return (
        option.name.toLowerCase().includes(query) ||
        option.email?.toLowerCase().includes(query)
      );
    });
  }, [options, search]);

  const toggleDraft = (id: string) => {
    setDraftSelection((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const removeSelected = (id: string) => {
    onChange(safeValue.filter((item) => item !== id));
  };

  const handleConfirm = () => {
    onChange(draftSelection);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-300 font-semibold">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Add User
        </Button>
      </div>

      {selectedUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-3 text-xs text-slate-400">
          No users added yet.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="relative rounded-lg border border-slate-800 bg-slate-900/40 p-3"
            >
              <button
                type="button"
                onClick={() => removeSelected(user.id)}
                className="absolute right-2 top-2 rounded-full border border-slate-700 bg-slate-900/80 p-1 text-slate-300 hover:text-white"
                aria-label={`Remove ${user.name}`}
              >
                <X size={12} />
              </button>
              <div className="text-sm text-slate-200">{user.name}</div>
              {user.email && (
                <div className="text-xs text-slate-400">{user.email}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border border-slate-800 bg-slate-950 text-slate-200">
          <DialogHeader>
            <DialogTitle>Select users for {label}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {filteredOptions.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 p-3 text-xs text-slate-400">
                No users found.
              </div>
            )}
            {filteredOptions.map((option) => {
              const isSelected = draftSelection.includes(option.id);
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => toggleDraft(option.id)}
                  className={`relative w-full rounded-lg border p-2 text-left ${
                    isSelected
                      ? "border-cyan-600 bg-slate-800"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  }`}
                >
                  <div className="text-sm text-slate-200">{option.name}</div>
                  {option.email && (
                    <div className="text-xs text-slate-400">{option.email}</div>
                  )}
                  {isSelected && (
                    <Check size={16} className="absolute right-3 top-3 text-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Add Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
