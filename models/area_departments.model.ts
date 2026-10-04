import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArea_departments extends Document {
  _id: Types.ObjectId;
  business_id: Types.ObjectId | null;
  region_id: Types.ObjectId | null;
  area_id: Types.ObjectId | null;
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

Area_departmentsSchema.index({ area_id: 1, status: 1, _id: 1 });
Area_departmentsSchema.index({ type: 1, status: 1, area_id: 1, _id: 1 });

const Area_departments = mongoose.models?.area_departments || mongoose.model<IArea_departments>('area_departments', Area_departmentsSchema);

export default Area_departments;

