"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { useGetEqCampsById, useUpdateEqCamp } from "@/query/enquirymanager/queries";
import { EQ_CAMP_CAPACITY, EQ_CAMP_TYPES } from "@/lib/constants";
import { number } from "zod";
import { toast } from "sonner";

export default function EditCampPage() {
  const params = useParams<{ camp_id: string }>();
  const router = useRouter();

  const { data: campData } = useGetEqCampsById(params.camp_id);
  const { mutateAsync: updateCamp, isPending } = useUpdateEqCamp();

  const capacityLimits: Record<string, number> = {
    "<500": 500, "500-1000": 1000, "1000-1500": 1500, "1500-2000": 2000, "2000-2500": 2500, "2500-3000": 3000, "3000+": 99999
};


  const [form, setForm] = useState({
    camp_name: "",
    camp_type: "",
    camp_capacity: "",
    camp_occupancy: 0,
    headoffice_phone: "",
    headoffice_geo_loc: "",
    headffice_address: "",
    headoffice_other_details: "",
    client_company: "",
    realestate_company: "",
    landlord_company: "",
    latitude: "",
    longitude: ""
  });

  useEffect(() => {
    console.log("Camp_data: ", campData);
    
    if (campData?.camp) {
      const ho = campData?.camp?.headoffice_id;

      setForm({
        camp_name: campData.camp.camp_name ?? "",
        camp_type: campData.camp.camp_type ?? "",
        camp_capacity: campData.camp.camp_capacity ?? "",
        camp_occupancy: campData.camp.camp_occupancy ?? 0,
        latitude: campData.camp.latitude ?? "",
        longitude: campData.camp.longitude ?? "",
        client_company: campData.camp.client_company_id?.client_company_name ?? "",
        landlord_company: campData.camp.landlord_id?.landlord_name ?? "",
        realestate_company: campData.camp.realestate_id?.company_name ?? "",

        // head office (non-nested)
        headoffice_phone: ho?.phone ?? "",
        headoffice_geo_loc: ho?.geo_location ?? "",
        headffice_address: ho?.address ?? "",
        headoffice_other_details: ho?.other_details ?? "",
      });
    }
  }, [campData]);

  const handleSubmit = async () => {
    console.log(capacityLimits[form.camp_capacity]);
    
    if(capacityLimits[form.camp_capacity] < form.camp_occupancy){
        return toast.error("Camp Occupancy cannot exceed Camp Capacity")
    }
    const payload = {
      camp_id: params.camp_id,
      ...form, // no nested head office obj
    };

    const res = await updateCamp(payload);
    if(res?.status == 200){
        toast.success(res?.message || "Camp updated");
        return router.replace(`/admin/enquiries/camps/${params.camp_id}`);
    } else {
        return toast.error(res?.message || "Failed to Update Camp");
    }
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

      <h1 className="text-xl font-semibold mb-4">Edit Camp</h1>

      <div className="bg-gradient-to-tr from-slate-900/50 to-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-6">

        <Field label="Camp Name">
          <Input
            value={form.camp_name}
            onChange={(e) => setForm({ ...form, camp_name: e.target.value })}
          />
        </Field>

        <Field label="Camp Type">
          <Select
            value={form.camp_type}
            onValueChange={(v) => setForm({ ...form, camp_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {EQ_CAMP_TYPES.map((c)=> (
                 <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Camp Latitude">
          <Input
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
          />
        </Field>

        <Field label="Camp Longitude">
          <Input
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Camp Capacity">
            <Select
            value={form.camp_capacity}
            onValueChange={(v) => setForm({ ...form, camp_capacity: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {EQ_CAMP_CAPACITY.map((c)=> (
                 <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </Field>

          <Field label="Camp Occupancy">
            <Input
              type="number"
              value={form.camp_occupancy}
              onChange={(e) =>
                setForm({ ...form, camp_occupancy: e.target.value })
              }
            />
          </Field>
        </div>

        {/* HEAD OFFICE DETAILS */}
        <h2 className="text-lg font-semibold mt-6">Head Office Details</h2>

        <Field label="Phone">
          <Input
            value={form.headoffice_phone}
            onChange={(e) => setForm({ ...form, headoffice_phone: e.target.value })}
          />
        </Field>

        <Field label="Geo Location">
          <Input
            value={form.headoffice_geo_loc}
            onChange={(e) => setForm({ ...form, headoffice_geo_loc: e.target.value })}
          />
        </Field>

        <Field label="Address">
          <Input
            value={form.headffice_address}
            onChange={(e) => setForm({ ...form, headffice_address: e.target.value })}
          />
        </Field>

        <Field label="Other Details">
          <Input
            value={form.headoffice_other_details}
            onChange={(e) =>
              setForm({ ...form, headoffice_other_details: e.target.value })
            }
          />
        </Field>

        {/* HEAD OFFICE DETAILS */}
        <h2 className="text-lg font-semibold mt-6">Additional Details</h2>

        <Field label="Landlord">
          <Input
            value={form.landlord_company}
            onChange={(e) => setForm({ ...form, landlord_company: e.target.value })}
          />
        </Field>

        <Field label="Client Company">
          <Input
            value={form.client_company}
            onChange={(e) => setForm({ ...form, client_company: e.target.value })}
          />
        </Field>

        <Field label="Real Estate">
          <Input
            value={form.realestate_company}
            onChange={(e) => setForm({ ...form, realestate_company: e.target.value })}
          />
        </Field>
      </div>

      <Button
        className="mt-6 flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600"
        onClick={handleSubmit}
        disabled={isPending}
      >
        <Save size={18} /> Save Changes
      </Button>
    </div>
  );
}

/* Reusable Field Component */
function Field({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400">{label}</Label>
      {children}
    </div>
  );
}
