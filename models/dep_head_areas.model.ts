import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDep_head_areas extends Document {
  _id: Types.ObjectId;
  dep_head_id: Types.ObjectId | null;
  dep_region_id: Types.ObjectId | null;
  dep_area_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number | null;
}

const Dep_head_areasSchema: Schema = new Schema({
  dep_head_id: { type: Schema.Types.ObjectId, ref: "department_heads" },
  dep_region_id: { type: Schema.Types.ObjectId, ref: "department_regions" },
  dep_area_id: { type: Schema.Types.ObjectId, ref: "department_areas" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Dep_head_areas = mongoose.models?.dep_head_areas || mongoose.model<IDep_head_areas>('dep_head_areas', Dep_head_areasSchema);

export default Dep_head_areas;

