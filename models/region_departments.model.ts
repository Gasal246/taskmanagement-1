import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRegion_departments extends Document {
    _id: ObjectId;
    status: Number;
    region_id: ObjectId;
    dep_name: String;
    type: String;
    createdAt: Date;
    updatedAt: Date;
}

const Region_departmentsSchema: Schema = new Schema({
  status: { type: Number, enum: [0, 1], default: 1 },
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  dep_name: { type: String },
  type: { type: String, enum: [ 'sales', 'marketing', 'it', 'finance', 'hr', 'operations', 'customer-support', 'legal', 'rnd', 'product-management', 'procurement', 'other' ] },
}, { timestamps: true });

const Region_departments = mongoose.models?.region_departments || mongoose.model<IRegion_departments>('region_departments', Region_departmentsSchema);

export default Region_departments;

