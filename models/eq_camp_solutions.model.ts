import mongoose, { Schema } from "mongoose";
import { COMMERCIAL_MODELS } from "@/lib/enquiries/catalogue";

// Separate camp-to-service mapping. Arrays of stable codes support both $in (any)
// and $all (all), and enquiries can join this collection through their camp_id.
const schema = new Schema({
  camp_id: { type: Schema.Types.ObjectId, ref: "eq_camps", required: true, unique: true },
  solutions_required: [{ type: String }],
  solution_details: [{ solution_key: { type: String, required: true }, value: { type: String, required: true }, _id: false }],
  solution_other: { type: String, default: "" },
  primary_solution: { type: String, default: "" },
  commercial_model: { type: String, enum: COMMERCIAL_MODELS, default: "To Be Determined" },
}, { timestamps: true });
schema.index({ solutions_required: 1, camp_id: 1 });
export default mongoose.models.eq_camp_solutions || mongoose.model("eq_camp_solutions", schema);
