"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGetEqAreaById, useUpdateEqArea } from "@/query/enquirymanager/queries";
import { toast } from "sonner";

export default function EditAreaPage() {
  const params = useParams<{ enquiry_id: string, area_id: string }>();
  const router = useRouter();

  const [areaName, setAreaName] = useState("");

  const {data: area, isLoading} = useGetEqAreaById(params.area_id);
  const {mutateAsync: UpdateArea, isPending} = useUpdateEqArea();

  useEffect(()=>{
    setAreaName(area?.area?.area_name);
    console.log("area: ", area);
  }, [area]);

  /* Save updated area */
  async function handleSubmit() {
    if (!areaName.trim()) return alert("Area name cannot be empty");

    const data = {
      area_id: area?.area?._id,
      area_name: areaName
    };

    const res = await UpdateArea(data);
    if(res?.status == 200){
      toast.success("Area activated")
      router.replace(`/admin/enquiries/${params.enquiry_id}`);
    } else {
      toast.error("Failed to Activate Area");
    }
  }

  if (isLoading) {
    return <div className="p-4 text-slate-200">Loading...</div>;
  }

  return (
    <div className="p-6 text-slate-100">
      <h1 className="text-xl font-bold mb-6">Edit Area</h1>

      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl w-full max-w-md">
        <label className="block text-sm mb-2 font-medium">Area Name</label>
        <input
          type="text"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
          placeholder="Enter area name"
        />

        <div className="flex gap-3 mt-5">
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
