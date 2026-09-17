import type mongoose from "mongoose";
import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import Eq_enquiry_solutions from "@/models/eq_enquiry_solutions.model";
import { EMPTY_CAMP_SOLUTIONS, type CampSolutions } from "@/lib/enquiries/solutions";

export async function saveEnquirySolutions(
  enquiryId: unknown,
  solutions: CampSolutions,
  session?: mongoose.ClientSession,
) {
  return Eq_enquiry_solutions.findOneAndUpdate(
    { enquiry_id: enquiryId },
    { $set: solutions },
    { upsert: true, runValidators: true, new: true, session },
  );
}

export async function saveFacilitySolutions(
  campId: unknown,
  solutions: CampSolutions,
  session?: mongoose.ClientSession,
) {
  return Eq_camp_solutions.findOneAndUpdate(
    { camp_id: campId },
    { $set: solutions },
    { upsert: true, runValidators: true, new: true, session },
  );
}

export async function getEnquirySolutions(enquiryId: unknown) {
  const mapping: any = await Eq_enquiry_solutions.findOne({ enquiry_id: enquiryId }).lean();
  return mapping ? {
    solutions_required: mapping.solutions_required || [],
    solution_details: mapping.solution_details || [],
    solution_other: mapping.solution_other || "",
    primary_solution: mapping.primary_solution || "",
    commercial_model: mapping.commercial_model || "To Be Determined",
  } : EMPTY_CAMP_SOLUTIONS;
}

export async function getFacilitySolutions(campId: unknown) {
  const mapping: any = await Eq_camp_solutions.findOne({ camp_id: campId }).lean();
  return mapping ? {
    solutions_required: mapping.solutions_required || [],
    solution_details: mapping.solution_details || [],
    solution_other: mapping.solution_other || "",
    primary_solution: mapping.primary_solution || "",
    commercial_model: mapping.commercial_model || "To Be Determined",
  } : EMPTY_CAMP_SOLUTIONS;
}
