"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export type ProjectCatalogueFilterValue = {
  project_sector: string;
  facility_type: string;
  solutions_required: string[];
};

export default function ProjectCatalogueFilters({
  value,
  onChange,
}: {
  value: ProjectCatalogueFilterValue;
  onChange: (next: ProjectCatalogueFilterValue) => void;
}) {
  const { data } = useGetEnquiryCatalogue();
  const catalogue = data?.catalogue || { project_sectors: [], solution_categories: [] };
  const [open, setOpen] = useState(false);
  const [draftSolutions, setDraftSolutions] = useState<string[]>([]);
  const sector = catalogue.project_sectors.find((entry: any) => entry.key === value.project_sector);
  const facilityTypes = value.project_sector
    ? (sector?.facility_types || []).filter((entry: any) => entry.is_active)
    : [];

  const updateDraft = (keys: string[], checked: boolean) => {
    setDraftSolutions((current) =>
      checked
        ? Array.from(new Set([...current, ...keys]))
        : current.filter((key) => !keys.includes(key))
    );
  };

  return (
    <>
      <div className="space-y-1">
        <p className="text-[11px] text-slate-400">Project Sector</p>
        <Select
          value={value.project_sector || "all"}
          onValueChange={(key) => onChange({
            ...value,
            project_sector: key === "all" ? "" : key,
            facility_type: "",
          })}
        >
          <SelectTrigger className="text-xs"><SelectValue placeholder="All Project Sectors" /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">All Project Sectors</SelectItem>
            {catalogue.project_sectors
              .filter((entry: any) => entry.is_active)
              .map((entry: any) => <SelectItem key={entry.key} value={entry.key}>{entry.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-slate-400">Facility Type</p>
        <Select
          disabled={!value.project_sector}
          value={value.facility_type || "all"}
          onValueChange={(key) => onChange({ ...value, facility_type: key === "all" ? "" : key })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder={value.project_sector ? "All Facility Types" : "Select a Project Sector first"} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">All Facility Types</SelectItem>
            {facilityTypes.map((entry: any) => <SelectItem key={entry.key} value={entry.key}>{entry.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] text-slate-400">Solutions Required</p>
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) setDraftSolutions(value.solutions_required);
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between border-slate-700 bg-slate-950/60 text-xs font-normal text-slate-200 hover:bg-slate-900 hover:text-slate-100">
              <span className="flex items-center gap-2"><Filter size={14} /> Solutions Required</span>
              {value.solutions_required.length > 0 && (
                <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300">
                  {value.solutions_required.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(92vw,680px)] border-slate-800 bg-slate-950 p-0 text-slate-100">
            <div className="border-b border-slate-800 p-4">
              <h3 className="text-sm font-semibold">Solutions Required</h3>
              <p className="mt-1 text-xs text-slate-400">Show projects containing any selected solution.</p>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
              {catalogue.solution_categories
                .filter((group: any) => group.is_active)
                .map((group: any) => {
                  const services = group.services.filter((service: any) => service.is_active);
                  const keys = services.map((service: any) => service.key);
                  const selectedCount = keys.filter((key: string) => draftSolutions.includes(key)).length;
                  const allSelected = keys.length > 0 && selectedCount === keys.length;
                  return (
                    <fieldset key={group.key} className="rounded-lg border border-slate-800 p-3">
                      <legend className="px-1 text-xs font-semibold text-slate-200">{group.name}</legend>
                      {keys.length > 0 && (
                        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-cyan-300">
                          <Checkbox
                            checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false}
                            onCheckedChange={(checked) => updateDraft(keys, checked === true)}
                            aria-label={`Select all in ${group.name}`}
                          />
                          Select all in group
                        </label>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {services.map((service: any) => (
                          <label key={service.key} className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-300">
                            <Checkbox
                              className="mt-0.5 shrink-0"
                              checked={draftSolutions.includes(service.key)}
                              onCheckedChange={(checked) => updateDraft([service.key], checked === true)}
                              aria-label={service.name}
                            />
                            <span>{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-800 p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftSolutions([]);
                  onChange({ ...value, solutions_required: [] });
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-cyan-700 text-white hover:bg-cyan-600"
                onClick={() => {
                  onChange({ ...value, solutions_required: draftSolutions });
                  setOpen(false);
                }}
              >
                Apply Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
