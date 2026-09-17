import { z } from "zod";
import { projectSupportingFieldsSchema } from "./project-classification";
import { EMPTY_CAMP_SOLUTIONS } from "./solutions";
import { validateDynamicClassification, validateDynamicSolutions } from "./catalogue-server";

const optionalId = z.string().trim().optional().default("");
const coordinate = (minimum: number, maximum: number, label: string) => z.preprocess(
  (value) => value === null || value === undefined ? "" : String(value).trim(),
  z.string().refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum), `Enter a valid ${label}`),
);

const baseFacilityPayloadSchema = z.object({
  area_input_mode: z.enum(["existing", "new"]).default("existing"),
  camp_input_mode: z.enum(["existing", "new"]).default("existing"),
  area_name_request: z.string().trim().max(200).optional().default(""),
  camp_name_request: z.string().trim().max(250).optional().default(""),
  camp: optionalId,
  latitude: coordinate(-90, 90, "latitude"),
  longitude: coordinate(-180, 180, "longitude"),
  camp_capacity: z.string().trim().max(100).optional().default(""),
  camp_occupancy: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? null : Number(value),
    z.number().nonnegative("Occupancy cannot be negative").nullable(),
  ),
  landlord: z.string().trim().max(250).optional().default(""),
  real_estate: z.string().trim().max(250).optional().default(""),
  client_company: z.string().trim().max(250).optional().default(""),
  selected_head_office_id: optionalId,
  head_office_address: z.string().trim().max(1000).optional().default(""),
  head_office_contact: z.string().trim().max(100).optional().default(""),
  head_office_location: z.string().trim().max(500).optional().default(""),
  head_office_details: z.string().trim().max(2000).optional().default(""),
});

export async function validateEnquiryFacilityPayload(input: unknown) {
  const parsed = baseFacilityPayloadSchema.parse(input);
  const requestingFacility = parsed.area_input_mode === "new" || parsed.camp_input_mode === "new";
  if (requestingFacility && !parsed.camp_name_request) throw new z.ZodError([{ code: "custom", path: ["camp_name_request"], message: "Facility name is required" }]);
  if (!requestingFacility && !parsed.camp) throw new z.ZodError([{ code: "custom", path: ["camp"], message: "Select a Facility" }]);
  const classification = requestingFacility
    ? await validateDynamicClassification(input)
    : {
        project_sector: "",
        facility_type: "",
        facility_type_other: "",
        facility_type_detail: "",
        sector_field_values: [],
      };
  return {
    ...parsed,
    ...classification,
    ...projectSupportingFieldsSchema.parse(input),
    ...await validateDynamicSolutions(input),
  };
}

export async function parseEnquirySolutions(input: unknown) {
  return validateDynamicSolutions(input || EMPTY_CAMP_SOLUTIONS);
}

export function solutionFields(input: any) {
  return {
    solutions_required: Array.isArray(input?.solutions_required) ? input.solutions_required : [],
    solution_details: input?.solution_details || [],
    solution_other: input?.solution_other || "",
    primary_solution: input?.primary_solution || "",
    commercial_model: input?.commercial_model || "To Be Determined",
  };
}
