"use client";

import { use, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import FacilitySettingsHeader from "@/components/enquiries/FacilitySettingsHeader";
import FacilitySettingsSearch from "@/components/enquiries/FacilitySettingsSearch";
import CatalogueItemManager from "@/components/enquiries/CatalogueItemManager";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function ProjectSectorDetailPage({ params }: { params: Promise<{ sectorKey: string }> }) {
  const { sectorKey } = use(params);
  const { data, isLoading } = useGetEnquiryCatalogue();
  const sector = data?.catalogue?.project_sectors?.find((item: any) => item.key === decodeURIComponent(sectorKey));
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const matches = (value: unknown) => String(value || "").toLowerCase().includes(normalizedSearch);
  const filtered = useMemo(() => {
    if (!sector) return { types: [], fields: [], optionGroups: [], count: 0 };
    const types = (sector.facility_types || []).filter((item: any) => !normalizedSearch || matches(item.name) || matches(item.key));
    const fields = (sector.fields || []).filter((field: any) => !normalizedSearch || matches(field.name) || matches(field.key) || (field.options || []).some((option: any) => matches(option.name) || matches(option.key)));
    const optionGroups = (sector.fields || []).filter((field: any) => field.input_type === "select").map((field: any) => {
      const fieldMatches = !normalizedSearch || matches(field.name) || matches(field.key);
      const options = fieldMatches ? (field.options || []) : (field.options || []).filter((option: any) => matches(option.name) || matches(option.key));
      return { field, options };
    }).filter(({ options }: any) => options.length > 0);
    return { types, fields, optionGroups, count: types.length + fields.length + optionGroups.reduce((sum: number, group: any) => sum + group.options.length, 0) };
  // `matches` only depends on the normalized search value included below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, normalizedSearch]);
  if (isLoading) return <main className="p-6 text-sm text-slate-400">Loading sector settings…</main>;
  if (!sector) notFound();

  return <main className="space-y-5 p-4 pb-10 sm:p-6">
    <FacilitySettingsHeader title={sector.name} description="Configure Facility Types and the additional information collected when this Project Sector is selected." backHref="/admin/enquiries/camps/settings/project-sectors" breadcrumbs={[
      { label: "Enquiries", href: "/admin/enquiries" }, { label: "Facilities", href: "/admin/enquiries/camps" }, { label: "Settings", href: "/admin/enquiries/camps/settings" }, { label: "Project Sectors", href: "/admin/enquiries/camps/settings/project-sectors" }, { label: sector.name },
    ]} />
    <FacilitySettingsSearch value={search} onChange={setSearch} placeholder={`Search ${sector.name} settings…`} resultCount={filtered.count} />
    {!sector.is_active && <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">This Project Sector is archived. Its active children remain configured but are hidden from new selections until the sector is restored.</div>}
    <CatalogueItemManager entity="facility_type" parentId={sector.id} title="Facility Types" description="Facility Types appear after users select this Project Sector." items={filtered.types} addLabel="Add Facility Type" supportsCustomDetail reorderingDisabled={Boolean(normalizedSearch)} emptyMessage={normalizedSearch ? "No Facility Types match this search." : "No Facility Types yet."} />
    <section className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5">
      <CatalogueItemManager entity="sector_field" parentId={sector.id} title="Special Fields" description="Add text or select inputs that are shown only for this sector." items={filtered.fields} addLabel="Add Special Field" supportsFieldConfiguration compact reorderingDisabled={Boolean(normalizedSearch)} emptyMessage={normalizedSearch ? "No Special Fields match this search." : "No Special Fields yet."} />
      <div className="mt-5 space-y-4">
        {filtered.optionGroups.map(({ field, options }: any) => <div key={field.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <CatalogueItemManager entity="field_option" parentId={field.id} title={`${field.name} options`} description="Options are unique within this field. Archived options remain visible on existing Facilities." items={options} addLabel="Add Option" compact reorderingDisabled={Boolean(normalizedSearch)} emptyMessage="No options match this search." />
        </div>)}
      </div>
    </section>
  </main>;
}
