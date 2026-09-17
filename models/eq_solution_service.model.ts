import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  solution_category_id: { type: Schema.Types.ObjectId, ref: "eq_solution_category", required: true, immutable: true, index: true },
  name: { type: String, required: true, trim: true },
  normalized_name: { type: String, required: true },
  requires_custom_detail: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true, index: true },
  sort_order: { type: Number, default: 0, index: true },
}, { timestamps: true });
schema.index({ solution_category_id: 1, normalized_name: 1 }, { unique: true });

export default mongoose.models.eq_solution_service || mongoose.model("eq_solution_service", schema);
