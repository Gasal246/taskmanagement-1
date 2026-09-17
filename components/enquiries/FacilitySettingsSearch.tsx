"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FacilitySettingsSearch({ value, onChange, placeholder, resultCount }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount?: number;
}) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
    <div className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="border-slate-700 bg-slate-900/70 pl-9 pr-10 text-slate-100 placeholder:text-slate-500" />
        {value && <Button type="button" size="icon" variant="ghost" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:text-slate-100"><X className="h-4 w-4" /></Button>}
      </div>
      {value && resultCount !== undefined && <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{resultCount} {resultCount === 1 ? "match" : "matches"}</span>}
    </div>
  </div>;
}
