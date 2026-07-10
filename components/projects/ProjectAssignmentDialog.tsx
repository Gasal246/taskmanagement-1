import { Avatar } from "antd";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import LoaderSpin from "@/components/shared/LoaderSpin";

export default function ProjectAssignmentDialog({
  open,
  onOpenChange,
  title,
  description,
  search,
  onSearchChange,
  staffs,
  loadingStaffs,
  selectedId,
  onSelect,
  onAdd,
  adding,
  addLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  staffs: any[];
  loadingStaffs: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  adding: boolean;
  addLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search staff by name" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        <div className="relative flex-1 overflow-y-auto pb-4">
          {loadingStaffs && (
            <div className="flex h-[10vh] items-center justify-center"><LoaderSpin size={30} /></div>
          )}
          {!loadingStaffs && staffs.length === 0 && (
            <div className="w-full h-[10vh] flex items-center justify-center">
              <h1 className="text-xs font-medium text-slate-400">
                {search.trim() ? "No matching users" : "No available staffs found"}
              </h1>
            </div>
          )}
          {staffs.map((staff: any) => {
            const userId = staff?.user_id?._id?.toString?.() ?? staff?.user_id?._id ?? "";
            return (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={staff?._id}
                className="mt-2 flex cursor-pointer items-center justify-start gap-1 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-2 px-4 text-sm font-medium group relative"
                onClick={() => onSelect(userId)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="shrink-0" src={staff?.user_id?.avatar_url || "/avatar.png"} size={30} />
                  <div>
                    <h1 className="text-xs font-medium">{staff?.user_id?.name}</h1>
                    <p className="text-xs text-slate-400">{staff?.user_id?.email}</p>
                  </div>
                </div>
                {userId === selectedId && <Check className="absolute right-2 top-1 text-cyan-600" strokeWidth={3} size={18} />}
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={onAdd} disabled={adding}>{adding ? "Adding..." : addLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
