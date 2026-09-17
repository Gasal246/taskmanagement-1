import { z } from "zod";
export { CAPACITY_UNITS, OWNERSHIP_OPTIONS, PROJECT_STAGES } from "./catalogue";

// Supporting fields remain a fixed product workflow. Classification options are loaded from MongoDB.
export const projectSupportingFieldsSchema = z.object({
  capacity_unit: z.enum(["", "Beds", "Rooms", "Units"]).optional().default(""),
  project_stage: z.enum(["", "New Build", "Operational", "Renovation", "Expansion"]).optional().default(""),
  ownership: z.enum(["", "Government", "Semi-Government", "Private"]).optional().default(""),
});

export function getProjectClassificationLabels(camp: any) {
  return {
    sector: camp?.project_sector_name || camp?.classification?.sector_name || camp?.project_sector,
    facility: camp?.facility_type_name || camp?.classification?.facility_type_name || camp?.facility_type_detail || camp?.facility_type_other || camp?.facility_type,
  };
}
