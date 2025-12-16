import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation_departments extends Document {
  _id: ObjectId;
  region_id: ObjectId | null;
  dep_name: String | null;
  location_id: ObjectId | null;
  area_id: ObjectId | null;
  type: String | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_departmentsSchema: Schema = new Schema({
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  dep_name: { type: String },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  type: { type: String, enum: [ 'sales', 'marketing', 'it', 'finance', 'hr', 'operations', 'customer-support', 'legal', 'rnd', 'product-management', 'procurement', 'other' ] },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Location_departments = mongoose.models?.location_departments || mongoose.model<ILocation_departments>('location_departments', Location_departmentsSchema);

export default Location_departments;

