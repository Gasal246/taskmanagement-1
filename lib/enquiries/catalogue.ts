export type CatalogueOption = { id: string; key: string; name: string; is_active: boolean; sort_order: number };
export type FacilityTypeOption = CatalogueOption & { requires_custom_detail: boolean };
export type SectorFieldOption = CatalogueOption;
export type SectorField = CatalogueOption & {
  input_type: "text" | "select";
  is_required: boolean;
  options: SectorFieldOption[];
};
export type ProjectSectorOption = CatalogueOption & {
  facility_types: FacilityTypeOption[];
  fields: SectorField[];
};
export type SolutionServiceOption = CatalogueOption & { requires_custom_detail: boolean };
export type SolutionCategoryOption = CatalogueOption & { services: SolutionServiceOption[] };
export type EnquiryCatalogue = { project_sectors: ProjectSectorOption[]; solution_categories: SolutionCategoryOption[] };

export const EMPTY_ENQUIRY_CATALOGUE: EnquiryCatalogue = { project_sectors: [], solution_categories: [] };
export const normalizeCatalogueName = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export const CAPACITY_UNITS = ["Beds", "Rooms", "Units"] as const;
export const PROJECT_STAGES = ["New Build", "Operational", "Renovation", "Expansion"] as const;
export const OWNERSHIP_OPTIONS = ["Government", "Semi-Government", "Private"] as const;
export const COMMERCIAL_MODELS = ["Outright Purchase (Capex)", "Subscription / Monthly Rental", "BOO / Revenue Share", "Fixed Rent", "To Be Determined"] as const;

export function sectorByKey(catalogue: EnquiryCatalogue, key?: string) {
  return catalogue.project_sectors.find((sector) => sector.key === key);
}
export function facilityTypeByKey(catalogue: EnquiryCatalogue, key?: string) {
  return catalogue.project_sectors.flatMap((sector) => sector.facility_types).find((type) => type.key === key);
}
export function serviceByKey(catalogue: EnquiryCatalogue, key?: string) {
  return catalogue.solution_categories.flatMap((category) => category.services).find((service) => service.key === key);
}
export function getCatalogueClassificationLabels(catalogue: EnquiryCatalogue, facility: any) {
  const sector = sectorByKey(catalogue, facility?.project_sector);
  const type = sector?.facility_types.find((entry) => entry.key === facility?.facility_type);
  return {
    sector: sector ? `${sector.name}${sector.is_active ? "" : " (Archived)"}` : facility?.project_sector,
    facility: type ? `${type.name}${type.is_active && sector?.is_active ? "" : " (Archived)"}` : facility?.facility_type,
  };
}
export function getCatalogueServiceLabel(catalogue: EnquiryCatalogue, key: string) {
  const service = serviceByKey(catalogue, key);
  if (!service) return key;
  const category = catalogue.solution_categories.find((entry) => entry.services.some((candidate) => candidate.key === key));
  return `${service.name}${service.is_active && category?.is_active ? "" : " (Archived)"}`;
}
export function resolveSectorFieldValues(catalogue: EnquiryCatalogue, facility: any) {
  const sector = sectorByKey(catalogue, facility?.project_sector);
  return (facility?.sector_field_values || []).map((value: any) => {
    const field = sector?.fields.find((entry) => entry.key === value.field_key);
    const option = field?.options.find((entry) => entry.key === value.option_key);
    return { ...value, field_name: field?.name || value.field_key, value_name: option?.name || value.option_key, is_active: Boolean(sector?.is_active && field?.is_active && (!option || option.is_active)) };
  });
}
export function sectorFieldValuesRecord(values: any) {
  if (values && !Array.isArray(values) && typeof values === "object") return values;
  return Object.fromEntries((values || []).map((entry: any) => [entry.field_key, entry.option_key || entry.text_value || ""]));
}
export function solutionDetailsRecord(values: any, legacyOther?: string) {
  const record = values && !Array.isArray(values) && typeof values === "object"
    ? values : Object.fromEntries((values || []).map((entry: any) => [entry.solution_key, entry.value || ""]));
  if (legacyOther && !record["OTH-01"]) record["OTH-01"] = legacyOther;
  return record;
}
