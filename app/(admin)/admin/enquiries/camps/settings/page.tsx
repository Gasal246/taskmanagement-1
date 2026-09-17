"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Layers3 } from "lucide-react";
import FacilitySettingsHeader from "@/components/enquiries/FacilitySettingsHeader";
import FacilitySettingsSearch from "@/components/enquiries/FacilitySettingsSearch";

const sections = [
  { href: "/admin/enquiries/camps/settings/project-sectors", title: "Project Sectors", description: "Manage sectors, their Facility Types, and sector-specific form fields.", icon: Building2 },
  { href: "/admin/enquiries/camps/settings/solutions", title: "Solutions", description: "Manage solution categories and the services available within each category.", icon: Layers3 },
];

export default function FacilitySettingsPage() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSections = useMemo(() => sections.filter((section) => !normalizedSearch || `${section.title} ${section.description}`.toLowerCase().includes(normalizedSearch)), [normalizedSearch]);
  return <main className="space-y-5 p-4 pb-10 sm:p-6">
    <FacilitySettingsHeader title="Catalogue" description="Configure the classifications and solutions used by every Facility and enquiry form." backHref="/admin/enquiries/camps" breadcrumbs={[
      { label: "Enquiries", href: "/admin/enquiries" },
      { label: "Facilities", href: "/admin/enquiries/camps" },
      { label: "Settings" },
    ]} />
    <FacilitySettingsSearch value={search} onChange={setSearch} placeholder="Search Facility settings…" resultCount={filteredSections.length} />
    <div className="grid gap-4 md:grid-cols-2">
      {filteredSections.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-5 transition hover:border-cyan-800 hover:bg-slate-900/70">
        <div className="flex items-start justify-between gap-4"><span className="rounded-xl bg-slate-900 p-3 text-cyan-300"><Icon className="h-5 w-5" /></span><ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div>
        <h2 className="mt-5 text-lg font-semibold text-slate-100">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </Link>)}
      {filteredSections.length === 0 && <div className="rounded-2xl border border-dashed border-slate-800 px-5 py-10 text-center text-sm text-slate-500 md:col-span-2">No settings match “{search.trim()}”.</div>}
    </div>
  </main>;
}
