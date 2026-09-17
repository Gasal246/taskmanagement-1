import { randomUUID } from "node:crypto";
import { z } from "zod";
import EqProjectSector from "@/models/eq_project_sector.model";
import EqFacilityType from "@/models/eq_facility_type.model";
import EqSectorField from "@/models/eq_project_sector_field.model";
import EqSectorFieldOption from "@/models/eq_project_sector_field_option.model";
import EqSolutionCategory from "@/models/eq_solution_category.model";
import EqSolutionService from "@/models/eq_solution_service.model";
import {
  COMMERCIAL_MODELS,
  type EnquiryCatalogue,
  normalizeCatalogueName,
} from "./catalogue";

export const newCatalogueKey = () => randomUUID();
export const cleanCatalogueName = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ");
export const cleanCatalogueKey = (value: unknown) => String(value || "").trim().toUpperCase();
export const isValidCatalogueKey = (value: unknown) => /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(cleanCatalogueKey(value)) && cleanCatalogueKey(value).length <= 50;

const ordered = { sort_order: 1 as const, createdAt: 1 as const, _id: 1 as const };
const row = (entry: any) => ({
  id: String(entry._id), key: String(entry.key), name: String(entry.name),
  is_active: entry.is_active !== false, sort_order: Number(entry.sort_order || 0),
});

export async function getEnquiryCatalogue(): Promise<EnquiryCatalogue> {
  const [sectors, facilityTypes, fields, options, categories, services]: any[][] = await Promise.all([
    EqProjectSector.find({}).sort(ordered).lean(),
    EqFacilityType.find({}).sort(ordered).lean(),
    EqSectorField.find({}).sort(ordered).lean(),
    EqSectorFieldOption.find({}).sort(ordered).lean(),
    EqSolutionCategory.find({}).sort(ordered).lean(),
    EqSolutionService.find({}).sort(ordered).lean(),
  ]);
  return {
    project_sectors: sectors.map((sector) => ({
      ...row(sector),
      facility_types: facilityTypes.filter((type) => String(type.project_sector_id) === String(sector._id)).map((type) => ({
        ...row(type), requires_custom_detail: Boolean(type.requires_custom_detail),
      })),
      fields: fields.filter((field) => String(field.project_sector_id) === String(sector._id)).map((field) => ({
        ...row(field), input_type: field.input_type, is_required: Boolean(field.is_required),
        options: options.filter((option) => String(option.field_id) === String(field._id)).map(row),
      })),
    })),
    solution_categories: categories.map((category) => ({
      ...row(category),
      services: services.filter((service) => String(service.solution_category_id) === String(category._id)).map((service) => ({
        ...row(service), requires_custom_detail: Boolean(service.requires_custom_detail),
      })),
    })),
  };
}

export class CatalogueValidationError extends Error {
  status = 400;
}

function valueMap(input: any, field: string) {
  const value = input?.[field];
  if (Array.isArray(value)) return new Map(value.map((entry: any) => [String(entry.field_key || entry.solution_key || ""), entry.option_key || entry.text_value || entry.value || ""]));
  if (value && typeof value === "object") return new Map(Object.entries(value).map(([key, entry]) => [key, String(entry || "")]));
  return new Map<string, string>();
}

const canUse = (entry: { key: string; is_active: boolean }, existingKey?: string) => entry.is_active || entry.key === existingKey;

export async function validateDynamicClassification(input: any, existing?: any) {
  const catalogue = await getEnquiryCatalogue();
  const sector = catalogue.project_sectors.find((entry) => entry.key === String(input?.project_sector || ""));
  if (!sector || !canUse(sector, existing?.project_sector)) throw new CatalogueValidationError("Select an active project sector");
  const facilityType = sector.facility_types.find((entry) => entry.key === String(input?.facility_type || ""));
  if (!facilityType || !canUse(facilityType, existing?.facility_type) || (!sector.is_active && facilityType.key !== existing?.facility_type)) throw new CatalogueValidationError("Select an active facility type belonging to this project sector");
  const detail = cleanCatalogueName(input?.facility_type_detail ?? input?.facility_type_other);
  if (facilityType.requires_custom_detail && !detail) throw new CatalogueValidationError("Specify the selected facility type");

  const values = valueMap(input, "sector_field_values");
  if (!values.size && input?.hotel_classification) {
    const legacyField = sector.fields.find((field) => field.key === "HOS-HOTEL-CLASSIFICATION");
    const legacyOption = legacyField?.options.find((option) => normalizeCatalogueName(option.name) === normalizeCatalogueName(input.hotel_classification));
    if (legacyField && legacyOption) values.set(legacyField.key, legacyOption.key);
  }
  const existingValues = valueMap(existing, "sector_field_values");
  const sector_field_values: any[] = [];
  for (const field of sector.fields) {
    const raw = cleanCatalogueName(values.get(field.key));
    if (!field.is_active) {
      const old = existingValues.get(field.key);
      if (old) sector_field_values.push(field.input_type === "select" ? { field_key: field.key, option_key: old } : { field_key: field.key, text_value: old });
      continue;
    }
    if (!raw) {
      if (field.is_required) throw new CatalogueValidationError(`${field.name} is required`);
      continue;
    }
    if (field.input_type === "select") {
      const option = field.options.find((entry) => entry.key === raw);
      const existingOption = existingValues.get(field.key);
      if (!option || (!option.is_active && option.key !== existingOption)) throw new CatalogueValidationError(`Select a valid ${field.name}`);
      sector_field_values.push({ field_key: field.key, option_key: option.key });
    } else {
      if (raw.length > 500) throw new CatalogueValidationError(`${field.name} must be 500 characters or fewer`);
      sector_field_values.push({ field_key: field.key, text_value: raw });
    }
  }
  return {
    project_sector: sector.key,
    facility_type: facilityType.key,
    facility_type_detail: facilityType.requires_custom_detail ? detail : "",
    facility_type_other: facilityType.requires_custom_detail ? detail : "",
    sector_field_values,
  };
}

const commercialModelSchema = z.enum(COMMERCIAL_MODELS);
export type DynamicSolutions = {
  solutions_required: string[];
  solution_details: { solution_key: string; value: string }[];
  solution_other: string;
  primary_solution: string;
  commercial_model: typeof COMMERCIAL_MODELS[number];
};

export async function validateDynamicSolutions(input: any, existing?: any): Promise<DynamicSolutions> {
  const catalogue = await getEnquiryCatalogue();
  const services = catalogue.solution_categories.flatMap((category) => category.is_active
    ? category.services.map((service) => ({ ...service, parent_active: true }))
    : category.services.map((service) => ({ ...service, parent_active: false })));
  const requested: string[] = Array.from(new Set<string>(Array.isArray(input?.solutions_required) ? input.solutions_required.map(String) : []));
  const existingKeys = new Set(Array.isArray(existing?.solutions_required) ? existing.solutions_required.map(String) : []);
  const selected = requested.map((key) => {
    const service = services.find((entry) => entry.key === key);
    if (!service || ((!service.is_active || !service.parent_active) && !existingKeys.has(key))) throw new CatalogueValidationError("Select valid active solutions");
    return service;
  });
  const primary = String(input?.primary_solution || "");
  if (requested.length && !requested.includes(primary)) throw new CatalogueValidationError("Choose a primary solution from the selected services");
  if (!requested.length && primary) throw new CatalogueValidationError("Select the service in Solutions Required first");
  const primaryService = selected.find((service) => service.key === primary);
  if (primaryService && (!primaryService.is_active || !primaryService.parent_active) && primary !== String(existing?.primary_solution || "")) throw new CatalogueValidationError("Archived solutions cannot be selected as the primary solution");
  const details = valueMap(input, "solution_details");
  if (!details.size && input?.solution_other && requested.includes("OTH-01")) details.set("OTH-01", String(input.solution_other));
  const solution_details = selected.filter((service) => service.requires_custom_detail).map((service) => {
    const value = cleanCatalogueName(details.get(service.key));
    if (!value) throw new CatalogueValidationError(`Describe ${service.name}`);
    if (value.length > 500) throw new CatalogueValidationError(`${service.name} details must be 500 characters or fewer`);
    return { solution_key: service.key, value };
  });
  const commercial = commercialModelSchema.safeParse(input?.commercial_model || "To Be Determined");
  if (!commercial.success) throw new CatalogueValidationError("Select a valid commercial model");
  return {
    solutions_required: requested,
    solution_details,
    solution_other: solution_details.find((entry) => entry.solution_key === "OTH-01")?.value || "",
    primary_solution: primary,
    commercial_model: commercial.data,
  };
}

export function duplicateCatalogueError(error: any) {
  return error?.code === 11000;
}
