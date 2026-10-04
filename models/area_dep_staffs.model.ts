import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArea_dep_staffs extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | null;
  status: Number | null;
  area_dep_id: Types.ObjectId | null;
  createAt: Date;
  updatedAt: Date;
}

const Area_dep_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
  area_dep_id: { type: Schema.Types.ObjectId, ref: "area_departments" },
}, { timestamps: true });

Area_dep_staffsSchema.index({ area_dep_id: 1, status: 1, _id: 1 });
Area_dep_staffsSchema.index({ user_id: 1, area_dep_id: 1, status: 1 });

const Area_dep_staffs = mongoose.models?.area_dep_staffs || mongoose.model<IArea_dep_staffs>('area_dep_staffs', Area_dep_staffsSchema);

export default Area_dep_staffs;

