import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArea_staffs extends Document {
  _id: Types.ObjectId;
  staff_id: Types.ObjectId | null;
  area_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Area_staffsSchema: Schema = new Schema({
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Area_staffsSchema.index({ area_id: 1, status: 1, _id: 1 });
Area_staffsSchema.index({ staff_id: 1, area_id: 1, status: 1 });

const Area_staffs = mongoose.models?.area_staffs || mongoose.model<IArea_staffs>('area_staffs', Area_staffsSchema);

export default Area_staffs;

