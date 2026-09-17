"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddEnquiryCatalogueItem, useUpdateEnquiryCatalogueItem } from "@/query/enquirymanager/queries";

type Entity = "project_sector" | "facility_type" | "sector_field" | "field_option" | "solution_category" | "solution_service";

type Props = {
  entity: Entity;
  title: string;
  description?: string;
  items: any[];
  parentId?: string;
  addLabel: string;
  detailsHref?: (item: any) => string;
  supportsCustomDetail?: boolean;
  supportsFieldConfiguration?: boolean;
  compact?: boolean;
  reorderingDisabled?: boolean;
  emptyMessage?: string;
};

export default function CatalogueItemManager({
  entity, title, description, items, parentId, addLabel, detailsHref,
  supportsCustomDetail = false, supportsFieldConfiguration = false, compact = false,
  reorderingDisabled = false, emptyMessage = "No items yet.",
}: Props) {
  const { mutateAsync: addItem, isPending: adding } = useAddEnquiryCatalogueItem();
  const { mutateAsync: updateItem, isPending: updating } = useUpdateEnquiryCatalogueItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [catalogueKey, setCatalogueKey] = useState("");
  const [requiresCustomDetail, setRequiresCustomDetail] = useState(false);
  const [inputType, setInputType] = useState<"text" | "select">("text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");
  const acceptsUserKey = entity === "project_sector" || entity === "facility_type";

  const openAdd = () => {
    setEditing(null); setName(""); setCatalogueKey(""); setRequiresCustomDetail(false); setInputType("text"); setRequired(false); setError(""); setDialogOpen(true);
  };
  const openEdit = (item: any) => {
    setEditing(item); setName(item.name); setCatalogueKey(item.key || ""); setRequiresCustomDetail(Boolean(item.requires_custom_detail));
    setInputType(item.input_type || "text"); setRequired(Boolean(item.is_required)); setError(""); setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) { setError("Enter a name"); return; }
    const normalizedKey = catalogueKey.trim().toUpperCase();
    if (!editing && acceptsUserKey && !normalizedKey) { setError("Enter a code"); return; }
    if (!editing && acceptsUserKey && (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalizedKey) || normalizedKey.length > 50)) {
      setError("Use up to 50 letters, numbers, and hyphens for the code");
      return;
    }
    const payload: any = {
      entity, name: name.trim(), key: acceptsUserKey ? normalizedKey : undefined, parent_id: parentId,
      requires_custom_detail: requiresCustomDetail,
      input_type: inputType, is_required: required,
    };
    const response = editing
      ? await updateItem({ ...payload, id: editing.id, action: "update" })
      : await addItem(payload);
    if (![200, 201].includes(Number(response?.status))) {
      setError(response?.message || "Unable to save this item");
      return;
    }
    toast.success(response.message || "Catalogue updated");
    setDialogOpen(false);
  };

  const runUpdate = async (payload: any, success: string) => {
    const response = await updateItem({ entity, ...payload });
    if (Number(response?.status) !== 200) { toast.error(response?.message || "Unable to update this item"); return; }
    toast.success(success);
  };

  return <section className={compact ? "space-y-3" : "rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className={compact ? "text-sm font-semibold text-slate-100" : "text-lg font-semibold text-slate-100"}>{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-xs text-slate-400">{description}</p>}
      </div>
      <Button type="button" size="sm" onClick={openAdd} className="bg-cyan-700 text-white hover:bg-cyan-600">
        <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
      </Button>
    </div>

    <div className="mt-4 space-y-2">
      {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-800 px-4 py-7 text-center text-sm text-slate-500">{emptyMessage}</div>}
      {items.map((item, index) => <div key={item.key} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-100">{item.name}</span>
            {!item.is_active && <span className="rounded-full bg-amber-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">Archived</span>}
            {item.requires_custom_detail && <span className="rounded-full bg-violet-950/70 px-2 py-0.5 text-[10px] text-violet-300">Description required</span>}
            {item.input_type && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{item.input_type === "select" ? "Select input" : "Text input"}{item.is_required ? " · Required" : " · Optional"}</span>}
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{item.key}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {detailsHref && <Button asChild size="sm" variant="ghost" className="text-cyan-300 hover:text-cyan-200"><Link href={detailsHref(item)}>Configure <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link></Button>}
          <Button type="button" size="icon" variant="ghost" title={reorderingDisabled ? "Clear search to change the order" : "Move up"} disabled={reorderingDisabled || index === 0 || updating} onClick={() => runUpdate({ id: item.id, action: "reorder", direction: "up" }, "Order updated")}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" title={reorderingDisabled ? "Clear search to change the order" : "Move down"} disabled={reorderingDisabled || index === items.length - 1 || updating} onClick={() => runUpdate({ id: item.id, action: "reorder", direction: "down" }, "Order updated")}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" title="Edit" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" title={item.is_active ? "Archive" : "Restore"} disabled={updating} onClick={() => runUpdate({ id: item.id, action: "set_active", is_active: !item.is_active }, item.is_active ? "Item archived" : "Item restored")}>
            {item.is_active ? <Archive className="h-4 w-4 text-amber-300" /> : <RotateCcw className="h-4 w-4 text-emerald-300" />}
          </Button>
        </div>
      </div>)}
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : addLabel}</DialogTitle>
          <DialogDescription>{acceptsUserKey ? "Names and codes must be unique. The code cannot be changed after creation." : "Names are unique without regard to capitalization. Archived names remain reserved."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><label htmlFor={`${entity}-name`} className="text-xs font-semibold text-slate-300">Name</label><Input id={`${entity}-name`} value={name} onChange={(event) => setName(event.target.value)} autoFocus className="border-slate-700 bg-slate-900" /></div>
          {acceptsUserKey && <div className="space-y-2">
            <label htmlFor={`${entity}-key`} className="text-xs font-semibold text-slate-300">Code / suffix</label>
            <Input id={`${entity}-key`} value={catalogueKey} onChange={(event) => setCatalogueKey(event.target.value.toUpperCase())} disabled={Boolean(editing)} maxLength={50} placeholder={entity === "project_sector" ? "e.g. HOS" : "e.g. HOS-03"} className="border-slate-700 bg-slate-900 font-mono uppercase" />
            <p className="text-[11px] text-slate-500">Use letters, numbers, and hyphens. This code is permanent after saving.</p>
          </div>}
          {supportsCustomDetail && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 p-3"><Checkbox checked={requiresCustomDetail} onCheckedChange={(value) => setRequiresCustomDetail(value === true)} /><span><span className="block text-sm text-slate-200">Require custom description</span><span className="text-xs text-slate-500">The form asks for details whenever this option is selected.</span></span></label>}
          {supportsFieldConfiguration && <>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-300">Input type</label><Select value={inputType} onValueChange={(value: "text" | "select") => setInputType(value)}><SelectTrigger className="border-slate-700 bg-slate-900"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="select">Select</SelectItem></SelectContent></Select></div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 p-3"><Checkbox checked={required} onCheckedChange={(value) => setRequired(value === true)} /><span className="text-sm text-slate-200">Required field</span></label>
          </>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="button" onClick={save} disabled={adding || updating}>{adding || updating ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
