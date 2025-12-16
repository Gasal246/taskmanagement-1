"use client";

import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGetEqAreaProfile, useUpdateEqArea } from "@/query/enquirymanager/queries";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AreaDetailsPage() {
  const router = useRouter();
  const params = useParams<{ area_id: string }>();

  const { data: area, isLoading, refetch } = useGetEqAreaProfile(params.area_id);
  const {mutateAsync: updateArea, isPending} = useUpdateEqArea();

  const [editOpen, setEditOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  useEffect(() => {
    if (area?.area?.area_name) {
      setNewAreaName(area.area.area_name);
    }
  }, [area]);

  const handleSave = async () => {
    // TODO: Call your API here
    console.log("Save new area name: ", newAreaName);

    const data = {
        area_id: params.area_id,
        area_name: newAreaName
    };

    const res = await updateArea(data);
    if(res?.status == 200){
        toast.success(res?.message || "Area Updated");
        refetch();
    } else {
        toast.error(res?.message || "Failed to Update Area")
    }
    setEditOpen(false);
  };

  return (
    <div className="p-6 text-slate-200">
      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* HEADER */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 border border-slate-700 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin size={20} /> {area?.area?.area_name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {area?.area?.country_id?.country_name} •{" "}
            {area?.area?.region_id?.region_name} •{" "}
            {area?.area?.province_id?.province_name} •{" "}
            {area?.area?.city_id?.city_name}
          </p>
        </div>

        {/* Edit Button */}
        <Button
          variant="secondary"
          className="flex items-center gap-1"
          onClick={() => setEditOpen(true)}
        >
          <Pencil size={14} /> Edit
        </Button>
      </div>

      {/* DETAILS CARD */}
      <DetailsCard title="Area Information">
        <Detail label="Area Name" value={area?.area?.area_name} />
        <Detail label="Country" value={area?.area?.country_id?.country_name} />
        <Detail label="Region" value={area?.area?.region_id?.region_name} />
        <Detail label="Province" value={area?.area?.province_id?.province_name} />
        <Detail label="City" value={area?.area?.city_id?.city_name} />

        <Detail
          label="Number of Camps"
          value={area?.eq_count}
          color="text-cyan-400"
        />
      </DetailsCard>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-slate-900 text-slate-200 border-slate-700">
          <DialogHeader>
            <DialogTitle>Edit Area Name</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm text-slate-300">Area Name</label>
            <Input
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-slate-100"
            />
          </div>

          <DialogFooter>
            <Button variant="secondary"
            
            onClick={() => setEditOpen(false)}>
              Close
            </Button>
            <Button disabled={isPending} onClick={handleSave}>{isPending ? "Saving" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------------------------
    REUSABLE COMPONENTS
---------------------------------------------- */
function DetailsCard({ title, children }: any) {
  return (
    <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-5 rounded-lg border border-slate-800 mb-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Detail({
  label,
  value,
  color,
}: {
  label: string;
  value: any;
  color?: string;
}) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-2">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${color ?? "text-slate-200"}`}>
        {value || "N/A"}
      </span>
    </div>
  );
}
