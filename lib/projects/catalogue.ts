import mongoose from "mongoose";
import {
  CatalogueValidationError,
  validateDynamicClassification,
  validateDynamicSolutions,
} from "@/lib/enquiries/catalogue-server";
import EqEnquiry from "@/models/eq_enquiries.model";
import EqCamp from "@/models/eq_camps.model";
import EqEnquirySolutions from "@/models/eq_enquiry_solutions.model";
import EqCampSolutions from "@/models/eq_camp_solutions.model";
import {
  isValidProjectCapacity,
  isValidProjectOccupancy,
} from "@/lib/projects/capacity";

export async function validateProjectCatalogue(input: unknown, existing?: unknown) {
  const [classification, solutions] = await Promise.all([
    validateDynamicClassification(input, existing),
    validateDynamicSolutions(input, existing),
  ]);

  return {
    project_sector: classification.project_sector,
    facility_type: classification.facility_type,
    facility_type_detail: classification.facility_type_detail,
    facility_type_other: classification.facility_type_other,
    sector_field_values: classification.sector_field_values,
    solutions_required: solutions.solutions_required,
    solution_details: solutions.solution_details,
    solution_other: solutions.solution_other,
    primary_solution: solutions.primary_solution,
    commercial_model: solutions.commercial_model,
  };
}

export function validateProjectCapacity(input: any) {
  const capacity = String(input?.facility_capacity ?? "").trim();
  const occupancy = String(input?.facility_occupancy ?? "").trim();
  if (!isValidProjectCapacity(capacity)) {
    throw new CatalogueValidationError("Capacity must be a positive number, range, or limit");
  }
  if (!isValidProjectOccupancy(occupancy)) {
    throw new CatalogueValidationError("Occupancy must be a positive number or zero");
  }

  return {
    facility_capacity: capacity || null,
    facility_occupancy: occupancy === "" ? null : Number(occupancy.replace(/,/g, "")),
  };
}

export function projectCatalogueInputFromFacility(
  facility: any,
  enquirySolutions?: any | null,
  facilitySolutions?: any | null,
) {
  const solutions = enquirySolutions ?? facilitySolutions ?? {};

  return {
    project_sector: facility?.project_sector,
    facility_type: facility?.facility_type,
    facility_type_detail: facility?.facility_type_detail || facility?.facility_type_other || "",
    facility_type_other: facility?.facility_type_other || facility?.facility_type_detail || "",
    sector_field_values: facility?.sector_field_values || [],
    solutions_required: solutions?.solutions_required || [],
    solution_details: solutions?.solution_details || [],
    solution_other: solutions?.solution_other || "",
    primary_solution: solutions?.primary_solution || "",
    commercial_model: solutions?.commercial_model || "To Be Determined",
  };
}

export function projectConversionMetadata(enquiry: any, facility: any) {
  return {
    enquiry_id: enquiry?._id,
    enquiry_uuid: String(enquiry?.enquiry_uuid || ""),
    facility_id: facility?._id,
    facility_region_id: facility?.region_id || enquiry?.region_id,
    facility_area_id: facility?.area_id || enquiry?.area_id,
    facility_city_id: facility?.city_id || enquiry?.city_id,
    facility_client_company_id: facility?.client_company_id,
    facility_capacity: facility?.camp_capacity,
    facility_occupancy: facility?.camp_occupancy,
  };
}

export async function resolveProjectCatalogueForCreate(input: any) {
  const enquiryId = String(input?.enquiry_id || "").trim();
  if (!enquiryId) {
    return {
      ...(await validateProjectCatalogue(input)),
      ...validateProjectCapacity(input),
    };
  }
  if (!mongoose.isValidObjectId(enquiryId)) throw new CatalogueValidationError("Select a valid enquiry to convert");

  const enquiry: any = await EqEnquiry.findById(enquiryId)
    .select("camp_id enquiry_uuid region_id area_id city_id")
    .lean();
  if (!enquiry) throw new CatalogueValidationError("The enquiry being converted was not found");
  if (!enquiry.camp_id) throw new CatalogueValidationError("The enquiry does not have a linked Facility");

  const facility: any = await EqCamp.findById(enquiry.camp_id).lean();
  if (!facility) throw new CatalogueValidationError("The enquiry's linked Facility was not found");

  const [enquirySolutions, facilitySolutions]: any[] = await Promise.all([
    EqEnquirySolutions.findOne({ enquiry_id: enquiry._id }).lean(),
    EqCampSolutions.findOne({ camp_id: facility._id }).lean(),
  ]);
  const source = projectCatalogueInputFromFacility(facility, enquirySolutions, facilitySolutions);

  // Conversion copies the reviewed enquiry/Facility values. Passing the same
  // values as the existing record preserves archived catalogue selections.
  return {
    ...(await validateProjectCatalogue(source, source)),
    ...projectConversionMetadata(enquiry, facility),
  };
}
