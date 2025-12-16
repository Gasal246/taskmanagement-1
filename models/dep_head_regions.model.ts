import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDep_head_regions extends Document {
  _id: ObjectId;
  dep_region_id: ObjectId | null;
  dep_head_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Dep_head_regionsSchema: Schema = new Schema({
  dep_region_id: { type: Schema.Types.ObjectId, ref: "department_regions" },
  dep_head_id: { type: Schema.Types.ObjectId, ref: "department_heads" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Dep_head_regions = mongoose.models?.dep_head_regions || mongoose.model<IDep_head_regions>('dep_head_regions', Dep_head_regionsSchema);

export default Dep_head_regions;

