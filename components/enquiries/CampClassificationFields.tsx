"use client";

import { Controller, type Control, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";
import type { CatalogueOption } from "@/lib/enquiries/catalogue";

export default function CampClassificationFields({ control, watch, setValue, disabled = false }: {
  control: Control<any>; watch: UseFormWatch<any>; setValue: UseFormSetValue<any>; disabled?: boolean;
}) {
  const { data, isLoading } = useGetEnquiryCatalogue();
  const catalogue = data?.catalogue;
  const sectorKey = watch("project_sector");
  const facilityKey = watch("facility_type");
  const specialValues = watch("sector_field_values") || {};
  const sectors = catalogue?.project_sectors || [];
  const sector = sectors.find((entry: any) => entry.key === sectorKey);
  const selectableSectors = sectors.filter((entry: any) => entry.is_active || entry.key === sectorKey);
  const facilities = (sector?.facility_types || []).filter((entry: any) => entry.is_active || entry.key === facilityKey);
  const facility = facilities.find((entry: any) => entry.key === facilityKey);

  const select = (name: string, label: string, options: CatalogueOption[], optionDisabled = false) => (
    <Controller control={control} name={name} rules={{ required: `Select a ${label.toLowerCase()}` }} render={({ field, fieldState }) => (
      <div className="min-w-0 space-y-2">
        <label htmlFor={name} className="text-xs font-semibold text-slate-300">{label} *</label>
        <Select value={field.value || ""} disabled={disabled || optionDisabled || isLoading} onValueChange={(value) => {
          field.onChange(value);
          if (name === "project_sector") {
            setValue("facility_type", ""); setValue("facility_type_detail", ""); setValue("facility_type_other", ""); setValue("sector_field_values", {});
          } else if (name === "facility_type") {
            setValue("facility_type_detail", ""); setValue("facility_type_other", "");
          }
        }}>
          <SelectTrigger id={name} ref={field.ref} onBlur={field.onBlur} aria-invalid={Boolean(fieldState.error)} className="h-auto min-h-10 border-slate-800 bg-slate-950/40 text-left text-slate-100 [&>span]:line-clamp-2">
            <SelectValue placeholder={isLoading ? "Loading catalogue..." : optionDisabled ? "Select a project sector first" : `Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="max-h-80">{options.map((option) => <SelectItem key={option.key} value={option.key}>{option.name}{!option.is_active ? " (Archived)" : ""}</SelectItem>)}</SelectContent>
        </Select>
        {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
      </div>
    )} />
  );

  return <div className="grid gap-4 md:grid-cols-2">
    {select("project_sector", "Project Sector", selectableSectors)}
    {select("facility_type", "Facility Type", facilities, !sectorKey || sector?.is_active === false)}
    {facility?.requires_custom_detail && <Controller control={control} name="facility_type_detail" rules={{ required: "Please specify the facility type", maxLength: { value: 500, message: "Use 500 characters or fewer" } }} render={({ field, fieldState }) => <div className="space-y-2 md:col-span-2">
      <label htmlFor="facility_type_detail" className="text-xs font-semibold text-slate-300">Specify Facility Type *</label>
      <Input {...field} disabled={disabled} value={field.value || ""} onChange={(event) => { field.onChange(event); setValue("facility_type_other", event.target.value); }} id="facility_type_detail" maxLength={500} placeholder="Describe the facility type" className="border-slate-800 bg-slate-950/40" />
      {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
    </div>} />}
    {(sector?.fields || []).filter((entry: any) => entry.is_active || specialValues[entry.key]).map((special: any) => (
      <Controller key={special.key} control={control} name={`sector_field_values.${special.key}`} rules={{
        required: special.is_required ? `${special.name} is required` : false,
        maxLength: special.input_type === "text" ? { value: 500, message: "Use 500 characters or fewer" } : undefined,
      }} render={({ field, fieldState }) => <div className="min-w-0 space-y-2">
        <label htmlFor={`sector_field_${special.key}`} className="text-xs font-semibold text-slate-300">{special.name}{special.is_required ? " *" : ""}{!special.is_active ? " (Archived)" : ""}</label>
        {special.input_type === "select" ? <Select value={field.value || ""} disabled={disabled || !sector?.is_active || !special.is_active} onValueChange={field.onChange}>
          <SelectTrigger id={`sector_field_${special.key}`} ref={field.ref} onBlur={field.onBlur} className="border-slate-800 bg-slate-950/40"><SelectValue placeholder={`Select ${special.name.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>{special.options.filter((option: any) => option.is_active || option.key === field.value).map((option: any) => <SelectItem key={option.key} value={option.key}>{option.name}{!option.is_active ? " (Archived)" : ""}</SelectItem>)}</SelectContent>
        </Select> : <Input {...field} disabled={disabled || !sector?.is_active || !special.is_active} value={field.value || ""} id={`sector_field_${special.key}`} maxLength={500} className="border-slate-800 bg-slate-950/40" />}
        {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
      </div>} />
    ))}
    {!isLoading && !sectors.length && <p className="text-xs text-amber-300 md:col-span-2">No active Project Sectors are configured. Ask an administrator to add one in Facility Settings.</p>}
  </div>;
}
