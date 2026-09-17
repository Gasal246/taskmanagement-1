"use client";

import { type Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function ProjectCapacityFields({
  control,
  disabled = false,
}: {
  control: Control<any>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        control={control}
        name="facility_capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-slate-300">Capacity</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                disabled={disabled}
                inputMode="decimal"
                placeholder="e.g. 500"
                className="border-slate-700 focus:border-cyan-500 focus-visible:ring-0"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="facility_occupancy"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-semibold text-slate-300">Occupancy</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                disabled={disabled}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 450"
                className="border-slate-700 focus:border-cyan-500 focus-visible:ring-0"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
