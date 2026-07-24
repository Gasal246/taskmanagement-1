"use client";

import { useEffect, useState } from "react";
import { DEPARTMENT_TYPES } from "@/lib/constants";
import {
  useGetAreasandDeptsForRegion,
  useGetBusinessClients,
  useGetBusinessRegions,
  useUpdateProject,
} from "@/query/business/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const dateInput = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export default function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    project_name: project?.project_name || "",
    project_description: project?.project_description || "",
    start_date: dateInput(project?.start_date),
    end_date: dateInput(project?.end_date),
    status: project?.status || "pending",
    priority: project?.priority || "normal",
    type: project?.type || "other",
    client_id: project?.client_id?._id?.toString?.() || "",
    region_id: project?.region?._id?.toString?.() || project?.region_id?.toString?.() || "",
    area_id: project?.area?._id?.toString?.() || project?.area_id?.toString?.() || "",
  });
  const [clients, setClients] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const { mutateAsync: getClients } = useGetBusinessClients();
  const { mutateAsync: getRegions } = useGetBusinessRegions();
  const { mutateAsync: getAreas, isPending: loadingAreas } =
    useGetAreasandDeptsForRegion();
  const { mutateAsync: updateProject, isPending } = useUpdateProject();

  useEffect(() => {
    if (!open || !project?.business_id) return;
    let active = true;
    Promise.all([
      getClients(project.business_id.toString()),
      getRegions({ business_id: project.business_id.toString() }),
    ]).then(([clientsResponse, regionsResponse]) => {
      if (!active) return;
      setClients(clientsResponse?.data || []);
      setRegions(regionsResponse?.data || []);
    });
    return () => {
      active = false;
    };
  }, [getClients, getRegions, open, project?.business_id]);

  useEffect(() => {
    if (!open || !form.region_id) {
      setAreas([]);
      return;
    }
    let active = true;
    getAreas(form.region_id).then((response) => {
      if (active) setAreas(response?.data?.areas || []);
    });
    return () => {
      active = false;
    };
  }, [form.region_id, getAreas, open]);

  const setField = (field: string, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSave = async () => {
    if (form.project_name.trim().length < 2) {
      toast.error("Project name must be at least 2 characters.");
      return;
    }
    if (form.project_description.trim().length < 10) {
      toast.error("Description must be at least 10 characters.");
      return;
    }
    const response = await updateProject({
      project_id: project._id,
      ...form,
    });
    if (response?.status === 200) {
      toast.success("Project updated.");
      await onSaved();
      onOpenChange(false);
    } else {
      toast.error("Unable to update project.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-40px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Update Project</DialogTitle>
          <DialogDescription>
            Project options are loaded only when this dialog opens.
          </DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Project Name</Label>
            <Input
              value={form.project_name}
              onChange={(event) => setField("project_name", event.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={5}
              value={form.project_description}
              onChange={(event) =>
                setField("project_description", event.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(event) => setField("start_date", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>End Date</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(event) => setField("end_date", event.target.value)}
            />
          </div>
          {[
            {
              label: "Status",
              field: "status",
              options: ["pending", "approved", "completed", "cancelled"].map(
                (value) => ({ value, label: value })
              ),
            },
            {
              label: "Priority",
              field: "priority",
              options: ["low", "normal", "high"].map((value) => ({
                value,
                label: value,
              })),
            },
            {
              label: "Project Domain",
              field: "type",
              options: DEPARTMENT_TYPES,
            },
            {
              label: "Client",
              field: "client_id",
              options: [
                { value: "", label: "No client" },
                ...clients.map((client) => ({
                  value: client._id,
                  label: client.client_name,
                })),
              ],
            },
            {
              label: "Region",
              field: "region_id",
              options: regions.map((region) => ({
                value: region._id,
                label: region.region_name,
              })),
            },
            {
              label: "Area",
              field: "area_id",
              options: [
                { value: "", label: loadingAreas ? "Loading..." : "No area" },
                ...areas.map((area) => ({
                  value: area._id,
                  label: area.area_name,
                })),
              ],
            },
          ].map((select) => (
            <div className="space-y-1" key={select.field}>
              <Label>{select.label}</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                value={(form as any)[select.field]}
                onChange={(event) => setField(select.field, event.target.value)}
              >
                {select.options.map((option: any) => (
                  <option key={`${select.field}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
