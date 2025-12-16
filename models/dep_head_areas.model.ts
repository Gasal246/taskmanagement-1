import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDep_head_areas extends Document {
  _id: ObjectId;
  dep_head_id: ObjectId | null;
  dep_region_id: ObjectId | null;
  dep_area_id: ObjectId | null;
  user_id: ObjectId | null;
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

