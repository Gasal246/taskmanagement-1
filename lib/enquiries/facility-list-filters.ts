import { getEnquiryCatalogue } from "./catalogue-server";

export type FacilityCatalogueFilters = { project_sector: string; facility_type: string; solutions_required: string[] };

export class FacilityCatalogueFilterError extends Error {
  status = 400;
}

export async function parseFacilityCatalogueFilters(searchParams: Pick<URLSearchParams, "get">): Promise<FacilityCatalogueFilters> {
  const project_sector = searchParams.get("project_sector")?.trim() || "";
  const facility_type = searchParams.get("facility_type")?.trim() || "";
  const solutions_required = Array.from(new Set((searchParams.get("solutions_required") || "").split(",").map((code) => code.trim()).filter(Boolean)));
  const catalogue = await getEnquiryCatalogue();
  const sector = catalogue.project_sectors.find((item) => item.key === project_sector && item.is_active);
  if (project_sector && !sector) throw new FacilityCatalogueFilterError("Select a valid active project sector");
  if (facility_type && !project_sector) throw new FacilityCatalogueFilterError("Select a project sector before selecting a facility type");
  if (facility_type && !sector?.facility_types.some((item) => item.key === facility_type && item.is_active)) throw new FacilityCatalogueFilterError("Select an active facility type belonging to the selected project sector");
  const activeServices = new Set(catalogue.solution_categories.filter((category) => category.is_active).flatMap((category) => category.services.filter((service) => service.is_active).map((service) => service.key)));
  if (solutions_required.some((code) => !activeServices.has(code))) throw new FacilityCatalogueFilterError("Select valid active solutions required");
  return { project_sector, facility_type, solutions_required };
}
