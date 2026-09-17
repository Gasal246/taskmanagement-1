"use client";

import { Controller, type Control, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMERCIAL_MODELS } from "@/lib/enquiries/catalogue";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function CampSolutionsFields({ control, watch, setValue, disabled = false }: {
  control: Control<any>; watch: UseFormWatch<any>; setValue: UseFormSetValue<any>; disabled?: boolean;
}) {
  const { data, isLoading } = useGetEnquiryCatalogue();
  const selected: string[] = watch("solutions_required") || [];
  const primary = watch("primary_solution") || "";
  const details = watch("solution_details") || {};
  const groups = (data?.catalogue?.solution_categories || []).filter((group: any) => group.is_active || group.services.some((service: any) => selected.includes(service.key)));
  const services = groups.flatMap((group: any) => group.services).filter((service: any) => service.is_active || selected.includes(service.key));
  const serviceIsSelectable = (key: string) => {
    const group = groups.find((entry: any) => entry.services.some((service: any) => service.key === key));
    const service = group?.services.find((entry: any) => entry.key === key);
    return Boolean(group?.is_active && service?.is_active);
  };
  const inputClass = "border-slate-800 bg-slate-950/40 text-slate-100";
  return <div className="space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-slate-100">Solutions Required</h3><p className="mt-1 text-xs text-slate-400">Select each service the client is interested in. You can choose across categories.</p></div>
      <span className="shrink-0 rounded-full border border-cyan-900 bg-cyan-950/30 px-2.5 py-1 text-xs text-cyan-300" aria-live="polite">{selected.length} selected</span>
    </div>
    <Controller control={control} name="solutions_required" render={({ field, fieldState }) => {
      const update = (next: string[]) => {
        field.onChange(next);
        const nextDetails = Object.fromEntries(Object.entries(details).filter(([key]) => next.includes(key)));
        setValue("solution_details", nextDetails);
        setValue("solution_other", next.includes("OTH-01") ? String(nextDetails["OTH-01"] || "") : "");
        if (!next.includes(primary)) setValue("primary_solution", next.length === 1 ? next[0] : "");
      };
      return <>
        <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30 p-3 sm:p-4" role="group" aria-label="Solutions Required">
          {groups.map((group: any) => {
            const activeServices = group.services.filter((service: any) => service.is_active || selected.includes(service.key));
            const selectableCodes = activeServices.filter((service: any) => service.is_active && group.is_active).map((service: any) => service.key);
            const count = selectableCodes.filter((key: string) => selected.includes(key)).length;
            const all = selectableCodes.length > 0 && count === selectableCodes.length;
            return <fieldset key={group.key} className="min-w-0 rounded-lg border border-slate-800 p-3">
              <legend className="px-1 text-xs font-semibold text-slate-200">{group.name}{!group.is_active ? " (Archived)" : ""}</legend>
              {group.is_active && selectableCodes.length > 0 && <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-cyan-300">
                <Checkbox disabled={disabled || isLoading} checked={all ? true : count ? "indeterminate" : false} onCheckedChange={() => update(all ? selected.filter((key) => !selectableCodes.includes(key)) : Array.from(new Set([...selected, ...selectableCodes])))} aria-label={`Select all in ${group.name}`} />
                Select all in group
              </label>}
              <div className="grid gap-3 sm:grid-cols-2">
                {activeServices.map((service: any) => <label key={service.key} className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-300">
                  <Checkbox disabled={disabled || isLoading || !group.is_active || !service.is_active} className="mt-0.5 shrink-0" checked={selected.includes(service.key)} onCheckedChange={(checked) => update(checked === true ? [...selected, service.key] : selected.filter((key) => key !== service.key))} onBlur={field.onBlur} aria-label={service.name} />
                  <span>{service.name}{!service.is_active ? " (Archived)" : ""}</span>
                </label>)}
              </div>
            </fieldset>;
          })}
          {!isLoading && !groups.length && <p className="text-xs text-amber-300">No active solutions are configured.</p>}
        </div>
        {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
      </>;
    }} />
    {services.filter((service: any) => selected.includes(service.key) && service.requires_custom_detail).map((service: any) => <Controller key={service.key} control={control} name={`solution_details.${service.key}`} rules={{ required: `Describe ${service.name}`, maxLength: { value: 500, message: "Use 500 characters or fewer" } }} render={({ field, fieldState }) => <div className="space-y-2">
      <label htmlFor={`solution_detail_${service.key}`} className="text-xs font-semibold text-slate-300">{service.name} Details *</label>
      <Input {...field} disabled={disabled || !serviceIsSelectable(service.key)} value={field.value || ""} onChange={(event) => { field.onChange(event); if (service.key === "OTH-01") setValue("solution_other", event.target.value); }} id={`solution_detail_${service.key}`} maxLength={500} placeholder="Add the required details" className={inputClass} />
      {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
    </div>} />)}
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller control={control} name="primary_solution" rules={{ validate: (value) => !selected.length || selected.includes(value) || "Choose a primary solution from the selected services" }} render={({ field, fieldState }) => <div className="min-w-0 space-y-2">
        <label htmlFor="primary_solution" className="text-xs font-semibold text-slate-300">Primary Solution{selected.length > 0 && " *"}</label>
        <Select disabled={disabled || !selected.length} value={field.value || ""} onValueChange={field.onChange}>
          <SelectTrigger id="primary_solution" ref={field.ref} className={`${inputClass} h-auto min-h-10 text-left [&>span]:line-clamp-2`}><SelectValue placeholder={selected.length ? "Select main service" : "Select a solution first"} /></SelectTrigger>
          <SelectContent>{services.filter((service: any) => selected.includes(service.key)).map((service: any) => <SelectItem key={service.key} value={service.key} disabled={!serviceIsSelectable(service.key)}>{service.name}{!serviceIsSelectable(service.key) ? " (Archived)" : ""}</SelectItem>)}</SelectContent>
        </Select>
        {fieldState.error && <p role="alert" className="text-xs text-red-400">{fieldState.error.message}</p>}
      </div>} />
      <Controller control={control} name="commercial_model" render={({ field }) => <div className="space-y-2">
        <label htmlFor="commercial_model" className="text-xs font-semibold text-slate-300">Commercial Model</label>
        <Select disabled={disabled} value={field.value || "To Be Determined"} onValueChange={field.onChange}>
          <SelectTrigger id="commercial_model" className={inputClass}><SelectValue /></SelectTrigger>
          <SelectContent>{COMMERCIAL_MODELS.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
        </Select>
      </div>} />
    </div>
  </div>;
}
