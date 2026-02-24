"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetEqAreaProfile, useUpdateEqArea } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, PencilLine, Sparkles } from "lucide-react";

export default function EditAreaPage() {
  const params = useParams<{ enquiry_id: string; area_id: string }>();
  const router = useRouter();

  const [areaName, setAreaName] = useState("");

  const { data, isLoading } = useGetEqAreaProfile(params.area_id);
  const { mutateAsync: UpdateArea, isPending } = useUpdateEqArea();
  const area = data?.area;

  useEffect(() => {
    setAreaName(area?.area_name || "");
  }, [area?.area_name]);

  async function handleSubmit() {
    if (!areaName.trim()) {
      toast.error("Area name cannot be empty");
      return;
    }

    const res = await UpdateArea({
      area_id: area?._id,
      area_name: areaName.trim(),
    });

    if (res?.status === 200) {
      toast.success("Area approved and activated");
      router.replace(`/admin/enquiries/${params.enquiry_id}`);
      return;
    }

    toast.error(res?.message || "Failed to activate area");
  }

  if (isLoading) {
    return (
      <div className="p-6 text-slate-100">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading requested area details...
        </div>
      </div>
    );
  }

  const locationTrail = [
    area?.country_id?.country_name,
    area?.region_id?.region_name,
    area?.province_id?.province_name,
    area?.city_id?.city_name,
  ].filter(Boolean);

  return (
    <div className="p-4 md:p-6 text-slate-100 space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/30 px-3 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Staff Requested New Area
            </p>
            <h1 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight">
              Verify and Activate Requested Area
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Review the staff-submitted area name, adjust it if needed, and approve it so the enquiry can continue with a validated location.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300">
                Status: {area?.is_active ? "Already Active" : "Pending Approval"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300">
                Enquiries in this area: {data?.eq_count ?? 0}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300">
                Area ID: {String(area?._id || "-")}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Enquiry
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.25fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <MapPin className="h-4 w-4 text-cyan-300" />
            Request Context
          </div>

          <div className="space-y-2">
            <InfoRow label="Requested Area Name" value={area?.area_name || "Not provided"} highlight />
            <InfoRow label="Country" value={area?.country_id?.country_name || "Not set"} />
            <InfoRow label="Region" value={area?.region_id?.region_name || "Not set"} />
            <InfoRow label="Province" value={area?.province_id?.province_name || "Not set"} />
            <InfoRow label="City" value={area?.city_id?.city_name || "Not set"} />
          </div>

          <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3 text-xs text-cyan-100">
            Approving this area will activate it for future enquiries in the same location and improve consistency for staff submissions.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PencilLine className="h-4 w-4 text-emerald-300" />
            Finalize Area Name
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Approved Area Name</label>
              <Input
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Enter approved area name"
                className="bg-slate-900/60 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-500">
                Tip: Use the standardized spelling/casing used by your existing area records.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow
                label="Location Path"
                value={locationTrail.length ? locationTrail.join(" / ") : "Not available"}
              />
              <InfoRow
                label="Result"
                value={area?.is_active ? "Update Active Area Name" : "Activate New Area"}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {area?.is_active ? "Save Area Name" : "Approve & Activate Area"}
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight
          ? "border-emerald-700/50 bg-emerald-950/10"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm ${highlight ? "text-emerald-200 font-medium" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}
