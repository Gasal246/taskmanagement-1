import { ref } from 'firebase/storage';
import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRegion_dep_staffs extends Document {
  _id: ObjectId;
  region_dep_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Region_dep_staffsSchema: Schema = new Schema({
  region_dep_id: { type: Schema.Types.ObjectId, ref: "region_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Region_dep_staffs = mongoose.models?.region_dep_staffs || mongoose.model<IRegion_dep_staffs>('region_dep_staffs', Region_dep_staffsSchema);

export default Region_dep_staffs;

