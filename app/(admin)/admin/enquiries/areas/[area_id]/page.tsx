"use client";

import { ArrowLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGetEqAreaProfile, useRemoveEqArea } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function AreaDetailsPage() {
  const router = useRouter();
  const params = useParams<{ area_id: string }>();

  const { data: area } = useGetEqAreaProfile(params.area_id);
  const { mutateAsync: RemoveArea, isPending: isDeleting } = useRemoveEqArea();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteArea = async () => {
    const res = await RemoveArea(params.area_id);
    if (res?.status === 200) {
      toast.success(res?.message || "Area deleted");
      return router.replace("/admin/enquiries/areas");
    }
    toast.error(res?.message || "Failed to delete area");
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

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            className="flex items-center gap-1"
            onClick={() => router.push(`/admin/enquiries/areas/${params.area_id}/edit_area`)}
          >
            <Pencil size={14} /> Edit
          </Button>
          <Button
            variant="destructive"
            className="flex items-center gap-1"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this area?</DialogTitle>
            <DialogDescription>
              This will remove the area along with its camps and enquiries. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteArea}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
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
