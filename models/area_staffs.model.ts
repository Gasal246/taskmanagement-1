import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IArea_staffs extends Document {
  _id: ObjectId;
  staff_id: ObjectId | null;
  area_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Area_staffsSchema: Schema = new Schema({
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Area_staffs = mongoose.models?.area_staffs || mongoose.model<IArea_staffs>('area_staffs', Area_staffsSchema);

export default Area_staffs;

