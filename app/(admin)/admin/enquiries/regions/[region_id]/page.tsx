"use client";

import { ArrowLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGetEqRegionProfile, useRemoveEqRegion } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function RegionDetailsPage() {
  const router = useRouter();
  const params = useParams<{ region_id: string }>();

  const { data: regionData } = useGetEqRegionProfile(params.region_id);
  const { mutateAsync: RemoveRegion, isPending: isDeleting } = useRemoveEqRegion();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const region = regionData?.region;
  const stats = regionData?.stats;

  const handleDeleteRegion = async () => {
    const res = await RemoveRegion(params.region_id);
    if (res?.status === 200) {
      toast.success(res?.message || "Region deleted");
      return router.replace("/admin/enquiries/regions");
    }
    toast.error(res?.message || "Failed to delete region");
  };

  return (
    <div className="p-6 text-slate-200">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 border border-slate-700 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin size={20} /> {region?.region_name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {region?.country_id?.country_name}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            className="flex items-center gap-1"
            onClick={() => router.push(`/admin/enquiries/regions/${params.region_id}/edit_region`)}
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

      <DetailsCard title="Region Overview">
        <Detail label="Region Name" value={region?.region_name} />
        <Detail label="Country" value={region?.country_id?.country_name} />
        <Detail label="Provinces" value={stats?.provinces} />
        <Detail label="Cities" value={stats?.cities} />
        <Detail label="Areas" value={stats?.areas} />
        <Detail label="Camps" value={stats?.camps} />
        <Detail label="Enquiries" value={stats?.enquiries} />
        <Detail label="Agents" value={stats?.agents} />
        <Detail
          label="Created At"
          value={region?.createdAt ? new Date(region.createdAt).toLocaleDateString() : "-"}
        />
        <Detail
          label="Updated At"
          value={region?.updatedAt ? new Date(region.updatedAt).toLocaleDateString() : "-"}
        />
      </DetailsCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this region?</DialogTitle>
            <DialogDescription>
              This will remove the region only if it has no dependent provinces, cities, or enquiries.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteRegion}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
        {value ?? "N/A"}
      </span>
    </div>
  );
}
