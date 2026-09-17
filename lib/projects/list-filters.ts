import type { FacilityCatalogueFilters } from "@/lib/enquiries/facility-list-filters";

export function applyProjectCatalogueFilters(query: Record<string, any>, filters: FacilityCatalogueFilters) {
  if (filters.project_sector) query.project_sector = filters.project_sector;
  if (filters.facility_type) query.facility_type = filters.facility_type;
  if (filters.solutions_required.length > 0) {
    query.solutions_required = { $in: filters.solutions_required };
  }
  return query;
}
