"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useActivateEqCamp, useAssignEqCamptoEnquiry, useGetEnquiryCatalogue, useGetEqCampById } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Building2, Link2, Loader2, MapPin, PlusCircle, ShieldCheck } from "lucide-react";
import { getCatalogueClassificationLabels, getCatalogueServiceLabel, resolveSectorFieldValues } from "@/lib/enquiries/catalogue";

export default function ActivateCampPage() {
  const params = useParams<{ enquiry_id: string }>();
  const router = useRouter();

  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedCamp, setSelectedCamp] = useState("");

  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState("");
  const [campCapacity, setCampCapacity] = useState("");
  const [campOccupancy, setCampOccupancy] = useState<string>("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const { data: requestedCampData, isLoading: isRequestedCampLoading } = useGetEqCampById(params.enquiry_id, true);
  const { data: existingCampData, isLoading: isExistingCampLoading } = useGetEqCampById(params.enquiry_id, false);
  const { data: catalogueData } = useGetEnquiryCatalogue();
  const { mutateAsync: ActivateCamp, isPending: isActivating } = useActivateEqCamp();
  const { mutateAsync: AssignCamp, isPending: isAssigning } = useAssignEqCamptoEnquiry();

  const requestedCamp = requestedCampData?.camp;
  const existingCamps = useMemo(() => existingCampData?.camps || [], [existingCampData?.camps]);
  const saving = isActivating || isAssigning;
  const catalogue = catalogueData?.catalogue || { project_sectors: [], solution_categories: [] };
  const classification = getCatalogueClassificationLabels(catalogue, requestedCamp || {});
  const specialFields = resolveSectorFieldValues(catalogue, requestedCamp || {});

  useEffect(() => {
    if (!requestedCamp) return;
    setCampName(requestedCamp?.camp_name || "");
    setCampType(requestedCamp?.camp_type || "");
    setCampCapacity(requestedCamp?.camp_capacity || "");
    setCampOccupancy(
      requestedCamp?.camp_occupancy === null || requestedCamp?.camp_occupancy === undefined
        ? ""
        : String(requestedCamp.camp_occupancy)
    );
    setLatitude(requestedCamp?.latitude || "");
    setLongitude(requestedCamp?.longitude || "");
  }, [requestedCamp]);

  const selectedCampPreview = useMemo(
    () => existingCamps.find((camp: any) => String(camp?._id) === selectedCamp),
    [existingCamps, selectedCamp]
  );

  const handleSubmit = async () => {
    if (!requestedCamp?._id) {
      toast.error("Requested camp record not found");
      return;
    }

    if (mode === "existing") {
      if (!selectedCamp) {
        toast.error("Select an existing camp to match");
        return;
      }

      const confirmed = window.confirm(
        "This will notify the staff user that the site already exists and remove this duplicate enquiry. Continue?"
      );
      if (!confirmed) return;

      const res = await AssignCamp({
        camp_id: selectedCamp,
        enquiry_id: params.enquiry_id,
      });

      if (res?.status === 200) {
        toast.success(res?.notification || res?.message || "Camp matched successfully");
        router.replace("/admin/enquiries");
        return;
      }

      toast.error(res?.message || "Failed to assign camp");
      return;
    }

    const res = await ActivateCamp({
      camp_id: requestedCamp._id,
      enquiry_id: params.enquiry_id,
    });

    if (res?.status === 200) {
      toast.success(res?.message || "Camp activated");
      router.replace(`/admin/enquiries/${params.enquiry_id}`);
      return;
    }

    toast.error(res?.message || "Failed to activate camp");
  };

  if (isRequestedCampLoading || isExistingCampLoading) {
    return (
      <div className="p-6 text-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading camp approval details...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-slate-100 space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              Facility Approval
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Review the submitted Facility, correct it if needed, then approve it or match a duplicate.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}`)}>
            Back to Enquiry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.35fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Building2 className="h-4 w-4 text-cyan-300" />
            Submitted Facility (Pending)
          </div>

          <div className="grid gap-2 text-sm">
            <InfoRow label="Facility Name" value={requestedCamp?.camp_name || "Not provided"} />
            <InfoRow label="Project Sector" value={classification.sector || requestedCamp?.camp_type || "Not provided"} />
            <InfoRow label="Facility Type" value={classification.facility || requestedCamp?.camp_type || "Not provided"} />
            {specialFields.map((field: any) => <InfoRow key={field.field_key} label={field.field_name} value={`${field.value_name || field.text_value || "Not specified"}${field.is_active ? "" : " (Archived)"}`} />)}
            <InfoRow label="Project Stage" value={requestedCamp?.project_stage || "Not provided"} />
            <InfoRow label="Ownership" value={requestedCamp?.ownership || "Not provided"} />
            <InfoRow label="Capacity" value={requestedCamp?.camp_capacity || "Not provided"} />
            <InfoRow
              label="Occupancy"
              value={
                requestedCamp?.camp_occupancy === null || requestedCamp?.camp_occupancy === undefined
                  ? "Not provided"
                  : String(requestedCamp?.camp_occupancy)
              }
            />
            <InfoRow label="Latitude" value={requestedCamp?.latitude || "Not provided"} />
            <InfoRow label="Longitude" value={requestedCamp?.longitude || "Not provided"} />
            <InfoRow label="Solutions" value={(requestedCamp?.solutions_required || []).map((code: string) => getCatalogueServiceLabel(catalogue, code)).join(", ") || "Not specified"} />
          </div>

          <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200">
            Matching with an existing camp will mark this enquiry active and notify the staff user that the site was already visited.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`rounded-xl border p-4 text-left transition ${mode === "existing"
                ? "border-cyan-500/60 bg-cyan-950/20"
                : "border-slate-800 bg-slate-900/30 hover:border-slate-700"}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Link2 className="h-4 w-4 text-cyan-300" />
                Match Existing Facility
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Use this if the site was already created earlier by another staff/admin entry.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-xl border p-4 text-left transition ${mode === "new"
                ? "border-emerald-500/60 bg-emerald-950/20"
                : "border-slate-800 bg-slate-900/30 hover:border-slate-700"}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <PlusCircle className="h-4 w-4 text-emerald-300" />
                Approve New Facility
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Confirm and activate the staff-submitted camp details as a valid new camp.
              </p>
            </button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div>
                <p className="text-sm font-medium text-slate-200">Select Existing Camp</p>
                <p className="text-xs text-slate-400 mt-1">
                  When saved, the enquiry will be linked to this camp and the pending placeholder camp will be removed.
                </p>
              </div>

              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger className="text-slate-200">
                  <SelectValue placeholder="Select an active camp in this area" />
                </SelectTrigger>
                <SelectContent>
                  {existingCamps.map((camp: any) => (
                    <SelectItem key={camp?._id} value={String(camp?._id)}>
                      {camp?.camp_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCampPreview && (
                <div className="grid gap-2 md:grid-cols-2">
                  <InfoRow label="Selected Camp" value={selectedCampPreview?.camp_name || "-"} />
                  <InfoRow label="Camp ID" value={String(selectedCampPreview?._id || "-")} />
                </div>
              )}

              <div className="rounded-lg border border-cyan-900/70 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                Notification message sent to staff: <span className="font-medium">The Site is previously visited + {requestedCamp?.camp_name || "Requested site"}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs text-amber-100">
                Approval uses the stored Facility details shown on this page. Complete any corrections in Edit Enquiry before approval.
              </div>
              <Button type="button" variant="outline" onClick={() => router.push(`/admin/enquiries/${params.enquiry_id}/edit`)}>
                Edit Facility Details
              </Button>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : mode === "existing" ? (
                "Match and Activate Enquiry"
              ) : (
                "Approve Facility"
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-200 text-right break-all">{value}</span>
    </div>
  );
}
