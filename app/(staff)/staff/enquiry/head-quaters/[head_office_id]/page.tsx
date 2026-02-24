"use client";

import { ArrowLeft, Building2, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGetStaffEqHeadOfficeProfile, useRemoveStaffEqHeadOffice } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function HeadOfficeDetailsPage() {
  const router = useRouter();
  const params = useParams<{ head_office_id: string }>();

  const { data: headOfficeData } = useGetStaffEqHeadOfficeProfile(params.head_office_id);
  const { mutateAsync: RemoveHeadOffice, isPending: isDeleting } = useRemoveStaffEqHeadOffice();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const headOffice = headOfficeData?.head_office;
  const camps = headOfficeData?.camps || [];

  const handleDeleteHeadOffice = async () => {
    const res = await RemoveHeadOffice(params.head_office_id);
    if (res?.status === 200) {
      toast.success(res?.message || "Head office deleted");
      return router.replace("/staff/enquiry/head-quaters");
    }
    toast.error(res?.message || "Failed to delete head office");
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
            <Building2 size={20} /> Head Office
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {headOffice?.phone || "No phone"} / {headOffice?.address || "No address"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            className="flex items-center gap-1"
            onClick={() => router.push(`/staff/enquiry/head-quaters/${params.head_office_id}/edit_head_office`)}
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

      <DetailsCard title="Head Office Details">
        <Detail label="Phone" value={headOffice?.phone} />
        <Detail label="Geo Location" value={headOffice?.geo_location} />
        <Detail label="Address" value={headOffice?.address} />
        <Detail label="Other Details" value={headOffice?.other_details} />
        <Detail label="Attached Camps" value={camps.length} />
        <Detail
          label="Created At"
          value={headOffice?.createdAt ? new Date(headOffice.createdAt).toLocaleDateString() : "-"}
        />
        <Detail
          label="Updated At"
          value={headOffice?.updatedAt ? new Date(headOffice.updatedAt).toLocaleDateString() : "-"}
        />
      </DetailsCard>

      <DetailsCard title="Attached Camps">
        {camps.length === 0 ? (
          <div className="text-sm text-slate-400">No camps attached.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {camps.map((camp: any) => (
              <div
                key={camp._id}
                className="py-3 flex items-center justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">{camp.camp_name}</div>
                  <div className="text-xs text-slate-400">
                    {camp.area_id?.area_name || "No area"}
                  </div>
                </div>
                <span className="text-xs text-slate-500">Attached</span>
              </div>
            ))}
          </div>
        )}
      </DetailsCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this head office?</DialogTitle>
            <DialogDescription>
              Attached camps will be detached from this head office.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteHeadOffice}
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
        {value || "N/A"}
      </span>
    </div>
  );
}
