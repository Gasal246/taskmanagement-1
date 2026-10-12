"use client";

import { useState } from "react";
import { Avatar } from "antd";
import { UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const personId = (person: any) => String(person?._id || person?.id || "");

export default function ActivityAssignees({
  assignees,
  canRemove = false,
  removingId,
  onRemove,
}: {
  assignees: any[];
  canRemove?: boolean;
  removingId?: string | null;
  onRemove?: (person: any) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const people = Array.from(
    new Map((Array.isArray(assignees) ? assignees : [])
      .filter((person) => personId(person))
      .map((person) => [personId(person), person])).values()
  );
  const visible = people.slice(0, 2);
  const remaining = Math.max(0, people.length - visible.length);

  if (!people.length) {
    return (
      <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-500">
        No one assigned
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5" aria-label={`${people.length} people assigned`}>
        {visible.map((person) => (
          <button
            key={personId(person)}
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex max-w-44 items-center gap-1.5 rounded-md border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-left text-[11px] text-slate-200 transition-colors hover:border-cyan-400"
            title="View assigned people"
          >
            <Avatar src={person?.avatar_url || "/avatar.png"} size={20} />
            <span className="truncate">{person?.name || "Staff"}</span>
          </button>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-[11px] font-semibold text-cyan-200 transition-colors hover:border-cyan-400"
          >
            +{remaining} more
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>People assigned to this activity</DialogTitle>
            <DialogDescription>
              {people.length} {people.length === 1 ? "person can" : "people can"} view and comment on this activity.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {people.map((person) => {
              const id = personId(person);
              return (
                <div key={id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <Avatar src={person?.avatar_url || "/avatar.png"} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{person?.name || "Staff"}</p>
                    {person?.email && <p className="truncate text-xs text-slate-500">{person.email}</p>}
                  </div>
                  {canRemove && onRemove && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={removingId === id}
                      onClick={() => void onRemove(person)}
                      className="border-red-800/70 text-red-300 hover:border-red-500 hover:text-red-200"
                    >
                      {removingId === id ? <UserRound className="size-3.5 animate-pulse" /> : <X className="size-3.5" />}
                      <span className="ml-1">Remove</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
