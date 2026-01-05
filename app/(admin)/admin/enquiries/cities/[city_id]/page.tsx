"use client";

import { ArrowLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGetEqCityProfile, useRemoveEqCity } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function CityDetailsPage() {
  const router = useRouter();
  const params = useParams<{ city_id: string }>();

  const { data: cityData } = useGetEqCityProfile(params.city_id);
  const { mutateAsync: RemoveCity, isPending: isDeleting } = useRemoveEqCity();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const city = cityData?.city;
  const stats = cityData?.stats;

  const handleDeleteCity = async () => {
    const res = await RemoveCity(params.city_id);
    if (res?.status === 200) {
      toast.success(res?.message || "City deleted");
      return router.replace("/admin/enquiries/cities");
    }
    toast.error(res?.message || "Failed to delete city");
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
            <MapPin size={20} /> {city?.city_name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {city?.country_id?.country_name} / {city?.region_id?.region_name} / {city?.province_id?.province_name}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            className="flex items-center gap-1"
            onClick={() => router.push(`/admin/enquiries/cities/${params.city_id}/edit_city`)}
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

      <DetailsCard title="City Overview">
        <Detail label="City Name" value={city?.city_name} />
        <Detail label="Country" value={city?.country_id?.country_name} />
        <Detail label="Region" value={city?.region_id?.region_name} />
        <Detail label="Province" value={city?.province_id?.province_name} />
        <Detail label="Areas" value={stats?.areas} />
        <Detail label="Camps" value={stats?.camps} />
        <Detail label="Enquiries" value={stats?.enquiries} />
        <Detail
          label="Created At"
          value={city?.createdAt ? new Date(city.createdAt).toLocaleDateString() : "-"}
        />
        <Detail
          label="Updated At"
          value={city?.updatedAt ? new Date(city.updatedAt).toLocaleDateString() : "-"}
        />
      </DetailsCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this city?</DialogTitle>
            <DialogDescription>
              This will remove the city only if it has no dependent areas or enquiries.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteCity}
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
