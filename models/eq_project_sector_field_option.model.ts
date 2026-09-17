import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  field_id: { type: Schema.Types.ObjectId, ref: "eq_project_sector_field", required: true, immutable: true, index: true },
  name: { type: String, required: true, trim: true },
  normalized_name: { type: String, required: true },
  is_active: { type: Boolean, default: true, index: true },
  sort_order: { type: Number, default: 0, index: true },
}, { timestamps: true });
schema.index({ field_id: 1, normalized_name: 1 }, { unique: true });

export default mongoose.models.eq_project_sector_field_option || mongoose.model("eq_project_sector_field_option", schema);
