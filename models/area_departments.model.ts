import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IArea_departments extends Document {
  _id: ObjectId;
  business_id: ObjectId | null;
  region_id: ObjectId | null;
  area_id: ObjectId | null;
  type: String | null;
  dep_name: String | null;
  status: Number | null;
  createAt: Date;
  updatedAt: Date;
}

const Area_departmentsSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  type: { type: String, enum: [ 'sales', 'marketing', 'it', 'finance', 'hr', 'operations', 'customer-support', 'legal', 'rnd', 'product-management', 'procurement', 'other' ] },
  dep_name: { type: String },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Area_departments = mongoose.models?.area_departments || mongoose.model<IArea_departments>('area_departments', Area_departmentsSchema);

export default Area_departments;

