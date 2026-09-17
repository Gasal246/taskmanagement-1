"use client";

import { useState } from "react";
import FacilitySettingsHeader from "@/components/enquiries/FacilitySettingsHeader";
import FacilitySettingsSearch from "@/components/enquiries/FacilitySettingsSearch";
import CatalogueItemManager from "@/components/enquiries/CatalogueItemManager";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function ProjectSectorSettingsPage() {
  const { data, isLoading } = useGetEnquiryCatalogue();
  const sectors = data?.catalogue?.project_sectors || [];
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSectors = sectors.filter((sector: any) => !normalizedSearch || `${sector.name} ${sector.key}`.toLowerCase().includes(normalizedSearch));
  return <main className="space-y-5 p-4 pb-10 sm:p-6">
    <FacilitySettingsHeader title="Project Sectors" description="Add, rename, order, archive, and restore Project Sectors. Open a sector to configure its Facility Types and special fields." backHref="/admin/enquiries/camps/settings" breadcrumbs={[
      { label: "Enquiries", href: "/admin/enquiries" }, { label: "Facilities", href: "/admin/enquiries/camps" }, { label: "Settings", href: "/admin/enquiries/camps/settings" }, { label: "Project Sectors" },
    ]} />
    <FacilitySettingsSearch value={search} onChange={setSearch} placeholder="Search Project Sectors by name or key…" resultCount={filteredSectors.length} />
    {isLoading ? <div className="rounded-xl border border-slate-800 p-8 text-center text-sm text-slate-400">Loading Project Sectors…</div> : <CatalogueItemManager entity="project_sector" title="Project Sectors" items={filteredSectors} addLabel="Add Project Sector" detailsHref={(item) => `/admin/enquiries/camps/settings/project-sectors/${encodeURIComponent(item.key)}`} reorderingDisabled={Boolean(normalizedSearch)} emptyMessage={normalizedSearch ? `No Project Sectors match “${search.trim()}”.` : "No Project Sectors yet."} />}
  </main>;
}
