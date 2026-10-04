"use client";

import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eq_CAPACITY_OPTIONS } from "@/lib/constants";

export default function EnquiryCapacityFields({ form, facilityReadOnly = false }: {
  form: UseFormReturn<any>;
  facilityReadOnly?: boolean;
}) {
  const selectClassName = "h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-50";
  return <fieldset className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
    <legend className="px-2 text-sm font-semibold text-slate-200">Capacity, occupancy & priority</legend>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FormField control={form.control} name="camp_capacity" render={({ field }) => (
        <FormItem>
          <FormLabel>Facility Capacity</FormLabel>
          <FormControl><select {...field} value={field.value ?? ""} disabled={facilityReadOnly} className={selectClassName} onChange={event => {
            field.onChange(event.target.value);
            const index = Eq_CAPACITY_OPTIONS.indexOf(event.target.value as typeof Eq_CAPACITY_OPTIONS[number]);
            if (index >= 0) form.setValue("priority", String(index + 1), { shouldDirty: true, shouldValidate: true });
            void form.trigger("camp_occupancy");
          }}>
            <option value="">Select capacity</option>
            {Eq_CAPACITY_OPTIONS.map(capacity => <option key={capacity} value={capacity}>{capacity}</option>)}
          </select></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="camp_occupancy" render={({ field }) => (
        <FormItem>
          <FormLabel>Current Occupancy</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ""} type="number" min="0" step="1" disabled={facilityReadOnly} placeholder="Enter occupancy" className="border-slate-700 bg-slate-950" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="priority" render={({ field }) => (
        <FormItem>
          <FormLabel>Priority (1 – Low, 10 – High)</FormLabel>
          <FormControl><select {...field} value={field.value ?? ""} className={selectClassName}>
            <option value="">Select priority</option>
            {Eq_CAPACITY_OPTIONS.map((capacity, index) => <option key={capacity} value={String(index + 1)}>{index + 1} – {capacity}</option>)}
          </select></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  </fieldset>;
}
