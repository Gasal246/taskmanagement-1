"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useActivateEqCamp, useAssignEqCamptoEnquiry, useGetEqCampById } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EQ_CAMP_CAPACITY, EQ_CAMP_TYPES } from "@/lib/constants";

export default function EditCampPage() {
  const params = useParams<{ enquiry_id: string }>();
  const router = useRouter();

  const [newCamp, setNewCamp] = useState(false);
  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState("");
  const [campCapacity, setCampCapacity] = useState("");
  const [campOccupancy, setCampOccupancy] = useState<number | "">("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");


  const [selectedCamp, setSelectedCamp] = useState("");

  const { data: camp, isLoading } = useGetEqCampById(params?.enquiry_id, newCamp);
  const { mutateAsync: ActivateCamp, isPending } = useActivateEqCamp();
  const { mutateAsync: AssignCamp, isPending: isAssigning } = useAssignEqCamptoEnquiry();

  useEffect(() => {
    console.log("camp: ", camp);

    if (newCamp) {
      setCampName(camp?.camp?.camp_name);
      setCampType(camp?.camp?.camp_type);
      setCampCapacity(camp?.camp?.camp_capacity);
      setCampOccupancy(camp?.camp?.camp_occupancy);
      setLatitude(camp?.camp?.latitude);
      setLongitude(camp?.camp?.longitude);
    }
  }, [camp]);

  /* Update camp */
  async function handleSubmit() {
    switch (newCamp) {
      case true: {
        if (!campName.trim()) return alert("Camp name is required");

        const data = {
          camp_id: camp?.camp?._id,
          camp_name: campName,
          camp_type: campType,
          camp_occupancy: campOccupancy,
          enquiry_id: params.enquiry_id
        };

        const res = await ActivateCamp(data);
        if (res?.status == 200) {
          toast.success("Camp activated");
          return router.replace(`/admin/enquiries/${params.enquiry_id}`);
        } else {
          return toast.error(res?.message || "Failed to Activate Camp");
        }
        break;
      }

      case false: {
        const data = {
          camp_id: selectedCamp,
          enquiry_id: params.enquiry_id
        };

        const res = await AssignCamp(data);
        if (res?.status == 200) {
          toast.success(res?.message || "Camp Assinged");
          return router.replace(`/admin/enquiries/${params.enquiry_id}`);
        } else {
          return toast.error(res?.message || "Failed to assign camp")
        }
      }
    }

  }

  if (isLoading) return <div className="p-4 text-slate-200">Loading...</div>;

  return (
    <div className="p-6 text-slate-100">
      <h1 className="text-xl font-bold mb-6">Edit Camp</h1>

      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl w-full max-w-xl space-y-5">

        <div className="bg-slate-900/40 p-4 rounded-lg">
          <h2 className="font-semibold mb-2 text-sm">Manage Camp</h2>

          <div className="flex items-center gap-6 m-3">

            {/* Existing Camp*/}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="existing"
                checked={!newCamp}
                onChange={() => setNewCamp(false)}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-200">Select Existing Camp</span>
            </label>

            {/* New Camp */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="new"
                checked={newCamp}
                onChange={() => setNewCamp(true)}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-200">Create New Camp</span>
            </label>
          </div>
        </div>

        {newCamp ? (
          <div>
            {/* CAMP NAME */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Name</label>
              <input
                type="text"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:border-cyan-500 outline-none"
                placeholder="Enter camp name"
              />
            </div>

            {/* CAMP TYPE */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Type</label>
              <select
                value={campType}
                onChange={(e) => setCampType(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
              >
                {EQ_CAMP_TYPES.map((type: any) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* CAMP CAPACITY */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Capacity</label>
              <select
                value={campCapacity}
                onChange={(e) => setCampCapacity(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
              >
                {EQ_CAMP_CAPACITY.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* CAMP OCCUPANCY */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Occupancy</label>
              <input
                type="number"
                min={0}
                value={campOccupancy}
                onChange={(e) => setCampOccupancy(Number(e.target.value))}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
                placeholder="Enter current occupancy"
              />
            </div>

            {/* Camp Location */}
            {/* latitude */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:border-cyan-500 outline-none"
                placeholder="Enter Latitude"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-sm mb-2 font-medium">Camp Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full p-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:border-cyan-500 outline-none"
                placeholder="Enter Longitude"
              />
            </div>


          </div>
        ) : (
          <div className="bg-slate-900/40 p-4 rounded-lg">
            <h2 className="font-semibold mb-2 text-sm">Select Existing Camp</h2>

            <Select
              value={selectedCamp}
              onValueChange={(v) => setSelectedCamp(v)}
            >
              <SelectTrigger className="text-slate-200">
                <SelectValue placeholder="Select agent to assign" />
              </SelectTrigger>

              <SelectContent>
                {camp?.camps?.map((c: any) => (
                  <SelectItem key={c?._id} value={c?._id}>
                    {c?.camp_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mt-5">
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending || isAssigning ? "Saving..." : "Save Changes"}
          </Button>
        </div>

      </div>
    </div>
  );
}
