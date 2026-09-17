import { COMMERCIAL_MODELS } from "./catalogue";
export { COMMERCIAL_MODELS };
export type CampSolutions = {
  solutions_required: string[];
  solution_details: { solution_key: string; value: string }[];
  solution_other: string;
  primary_solution: string;
  commercial_model: typeof COMMERCIAL_MODELS[number];
};

export const EMPTY_CAMP_SOLUTIONS: CampSolutions = {
  solutions_required: [], solution_details: [], solution_other: "", primary_solution: "", commercial_model: "To Be Determined",
};

export function getSolutionLabel(code: string, custom?: string, labels?: Record<string, string>) {
  return labels?.[code] || (custom ? `${code}: ${custom}` : code);
}
