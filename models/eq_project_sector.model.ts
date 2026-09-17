import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  key: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true, trim: true },
  normalized_name: { type: String, required: true, unique: true, immutable: false },
  is_active: { type: Boolean, default: true, index: true },
  sort_order: { type: Number, default: 0, index: true },
}, { timestamps: true });

export default mongoose.models.eq_project_sector || mongoose.model("eq_project_sector", schema);
