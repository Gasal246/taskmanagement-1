import mongoose, { Schema } from "mongoose";
import { COMMERCIAL_MODELS } from "@/lib/enquiries/catalogue";

const schema = new Schema({
  enquiry_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry", required: true, unique: true },
  solutions_required: [{ type: String }],
  solution_details: [{ solution_key: { type: String, required: true }, value: { type: String, required: true }, _id: false }],
  solution_other: { type: String, default: "" },
  primary_solution: { type: String, default: "" },
  commercial_model: { type: String, enum: COMMERCIAL_MODELS, default: "To Be Determined" },
}, { timestamps: true });

schema.index({ solutions_required: 1, enquiry_id: 1 });

export default mongoose.models.eq_enquiry_solutions
  || mongoose.model("eq_enquiry_solutions", schema);
