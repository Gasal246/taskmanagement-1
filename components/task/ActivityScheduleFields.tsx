"use client";

import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function ActivityScheduleFields({ disabled = false }: { disabled?: boolean }) {
  const { control } = useFormContext();
  return (
    <div className="shrink-0 space-y-3">
      <div className="grid gap-3">
        {(["start_date", "end_date"] as const).map(name => (
          <FormField key={name} control={control} name={name} render={({ field }) => (
            <FormItem>
              <FormLabel>{name === "start_date" ? "Start date and time" : "End date and time"} *</FormLabel>
              <FormControl>
                <Input type="datetime-local" step="0.001" className="min-w-0 border-slate-700" {...field} value={field.value || ""} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}
      </div>
      {disabled && <p className="text-xs text-amber-300">Reopen this activity before changing its schedule.</p>}
      <p className="text-xs text-slate-400">Times use your local timezone. The task timeline is calculated from its first and last added activities.</p>
    </div>
  );
}
