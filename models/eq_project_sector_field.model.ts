import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  project_sector_id: { type: Schema.Types.ObjectId, ref: "eq_project_sector", required: true, immutable: true, index: true },
  name: { type: String, required: true, trim: true },
  normalized_name: { type: String, required: true },
  input_type: { type: String, enum: ["text", "select"], required: true },
  is_required: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true, index: true },
  sort_order: { type: Number, default: 0, index: true },
}, { timestamps: true });
schema.index({ project_sector_id: 1, normalized_name: 1 }, { unique: true });

export default mongoose.models.eq_project_sector_field || mongoose.model("eq_project_sector_field", schema);
