"use client";

import { useState } from "react";
import FacilitySettingsHeader from "@/components/enquiries/FacilitySettingsHeader";
import FacilitySettingsSearch from "@/components/enquiries/FacilitySettingsSearch";
import CatalogueItemManager from "@/components/enquiries/CatalogueItemManager";
import { useGetEnquiryCatalogue } from "@/query/enquirymanager/queries";

export default function SolutionSettingsPage() {
  const { data, isLoading } = useGetEnquiryCatalogue();
  const categories = data?.catalogue?.solution_categories || [];
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = categories.map((category: any) => {
    const categoryMatches = !normalizedSearch || `${category.name} ${category.key}`.toLowerCase().includes(normalizedSearch);
    const services = categoryMatches ? (category.services || []) : (category.services || []).filter((service: any) => `${service.name} ${service.key}`.toLowerCase().includes(normalizedSearch));
    return { ...category, services };
  }).filter((category: any) => !normalizedSearch || `${category.name} ${category.key}`.toLowerCase().includes(normalizedSearch) || category.services.length > 0);
  const resultCount = filteredCategories.reduce((sum: number, category: any) => sum + 1 + category.services.length, 0);
  return <main className="space-y-5 p-4 pb-10 sm:p-6">
    <FacilitySettingsHeader title="Solutions" description="Manage solution categories and services. Forms use the same ordering and active state configured here." backHref="/admin/enquiries/camps/settings" breadcrumbs={[
      { label: "Enquiries", href: "/admin/enquiries" }, { label: "Facilities", href: "/admin/enquiries/camps" }, { label: "Settings", href: "/admin/enquiries/camps/settings" }, { label: "Solutions" },
    ]} />
    <FacilitySettingsSearch value={search} onChange={setSearch} placeholder="Search solution categories and services…" resultCount={resultCount} />
    {isLoading ? <div className="rounded-xl border border-slate-800 p-8 text-center text-sm text-slate-400">Loading solutions…</div> : <>
      <CatalogueItemManager entity="solution_category" title="Solution Categories" description="Categories group related services across Facility and enquiry forms." items={filteredCategories} addLabel="Add Category" reorderingDisabled={Boolean(normalizedSearch)} emptyMessage={normalizedSearch ? `No solution categories or services match “${search.trim()}”.` : "No solution categories yet."} />
      <div className="space-y-4">
        {filteredCategories.map((category: any) => <section key={category.key} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-slate-100">{category.name}</h2>{!category.is_active && <span className="rounded-full bg-amber-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">Category archived</span>}</div>
          <CatalogueItemManager entity="solution_service" parentId={category.id} title="Services" description="Services are shown under this category. Enable custom descriptions for services that need free-form details." items={category.services || []} addLabel="Add Service" supportsCustomDetail compact reorderingDisabled={Boolean(normalizedSearch)} emptyMessage="No services match this search." />
        </section>)}
      </div>
    </>}
  </main>;
}
