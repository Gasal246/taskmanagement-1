"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ListPagination from "@/components/shared/ListPagination";
import type { OrganizationOverview } from "@/hooks/use-organization-overview";

export default function OrganizationSectionControls({ overview, name, label = name }: {
  overview: OrganizationOverview; name: string; label?: string;
}) {
  const section = overview.section(name);
  const { active, activate, deactivate } = section;
  const element = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState(section.search);
  const applySearch = useRef(section.setSearch);
  applySearch.current = section.setSearch;
  useEffect(() => () => deactivate(), [deactivate]);
  useEffect(() => {
    if (search.trim() === section.search) return;
    const timer = setTimeout(() => applySearch.current(search), 300);
    return () => clearTimeout(timer);
  }, [search, section.search]);
  // Observe each section instead of downloading lists below the viewport on page entry.
  useEffect(() => {
    if (active) return;
    if (!window.IntersectionObserver) { activate(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { activate(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, [active, activate]);
  return <div ref={element} className="my-3" data-organization-section={name}>
    <div className="flex flex-wrap items-center gap-3">
      <Input aria-label={`Search ${label}`} placeholder={`Search ${label}`} maxLength={100} value={search}
        onChange={event => setSearch(event.target.value)} className="max-w-sm" />
      {section.count !== undefined && <span className="text-xs text-slate-400">{section.count} {label} total</span>}
    </div>
    {section.error ? <div role="alert" className="mt-2 flex items-center gap-2 text-sm text-red-400">
      Unable to load {label}. <Button variant="outline" size="sm" onClick={section.retry}>Retry</Button>
    </div> : !section.loaded && <p role="status" className="mt-2 text-xs text-slate-400">Loading {label}…</p>}
    <ListPagination label={label} pagination={section.pagination} busy={section.busy || search.trim() !== section.search} onPage={section.setPage} />
  </div>;
}
