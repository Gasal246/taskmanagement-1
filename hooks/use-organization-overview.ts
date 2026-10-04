"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

const endpoints: Record<string, [string, string]> = {
  region: ["regions", "region_id"], area: ["area", "area_id"], location: ["locations", "loc_id"],
  "region-department": ["region-dep", "region_dep_id"], "area-department": ["area-dep", "area_dep_id"],
  "location-department": ["location-dep", "location_dep_id"], department: ["departments", "dep_id"],
};
type SectionState = { active: boolean; page: number; search: string };
const initial: SectionState = { active: false, page: 1, search: "" };

export function useOrganizationOverview(kind: string, id: string | undefined, sectionNames: string[]) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const scope = `${session?.user?.id}:${kind}:${id}`;
  const [settings, setSettings] = useState<{ scope: string; sections: Record<string, SectionState> }>({ scope, sections: {} });
  // Derive defaults synchronously when scope changes; never issue an old page/search for a new organization.
  const state = settings.scope === scope ? settings.sections : {};
  const update = useCallback((section: string, value: Partial<SectionState>) => setSettings(previous => {
    const before = previous.scope === scope ? previous.sections[section] || initial : initial;
    if (previous.scope === scope && Object.entries(value).every(([key, next]) => before[key as keyof SectionState] === next)) return previous;
    return { scope, sections: { ...(previous.scope === scope ? previous.sections : {}), [section]: { ...before, ...value } } };
  }), [scope]);
  const sectionKey = sectionNames.join("\0");
  const visibility = useMemo(() => Object.fromEntries(sectionKey.split("\0").map(name => [name, {
    activate: () => update(name, { active: true }), deactivate: () => update(name, { active: false }),
  }])), [sectionKey, update]);
  const [folder, parameter] = endpoints[kind];
  const prefix = ["organization-overview", session?.user?.id, kind, id];
  const enabled = !!id && status === "authenticated";
  const read = async (params: Record<string, string | number>, signal: AbortSignal) =>
    (await axios.get(`/api/business/${folder}/get-complete`, { params: { [parameter]: id, ...params }, signal, timeout: 15_000 })).data;
  const summary = useQuery({ queryKey: [...prefix, "summary"], queryFn: ({ signal }) => read({ mode: "summary" }, signal),
    enabled, staleTime: 30_000, gcTime: 60_000, retry: false });
  const results = useQueries({ queries: sectionNames.map(section => {
    const selected = state[section] || initial;
    return { queryKey: [...prefix, section, selected.page, selected.search],
      queryFn: ({ signal }: { signal: AbortSignal }) => read({ mode: "section", section, page: selected.page, limit: 25, search: selected.search }, signal),
      enabled: enabled && selected.active, staleTime: 30_000, gcTime: 60_000, retry: false,
    };
  }) });
  const overrun = results.findIndex((query, index) => state[sectionNames[index]]?.active && query.data?.pagination.page > query.data?.pagination.pages);
  const clampedSection = sectionNames[overrun], clampedPage = results[overrun]?.data?.pagination.pages;
  useEffect(() => {
    if (clampedSection && clampedPage) update(clampedSection, { page: clampedPage });
  }, [clampedSection, clampedPage, update]);
  const section = (name: string) => {
    const index = sectionNames.indexOf(name), query = results[index];
    const selected = state[name] || initial;
    return {
      ...selected, items: (enabled && !summary.error && !query?.error ? query?.data?.data || [] : []) as any[], pagination: query?.data?.pagination,
      count: summary.data?.data?.counts[name], loaded: !!query?.data && !query.error && !summary.error, busy: !!query?.isFetching,
      error: summary.error || query?.error,
      activate: visibility[name]?.activate, deactivate: visibility[name]?.deactivate,
      setPage: (page: number) => update(name, { page, active: true }),
      setSearch: (search: string) => update(name, { search: search.trim(), page: 1, active: true }),
      retry: () => { void summary.refetch(); if (selected.active) void query?.refetch(); },
    };
  };
  return { scope, section, organization: summary.data?.data?.organization,
    loading: summary.isFetching || results.some(query => query.isFetching),
    refresh: () => queryClient.invalidateQueries({ queryKey: prefix }),
  };
}

export type OrganizationOverview = ReturnType<typeof useOrganizationOverview>;
