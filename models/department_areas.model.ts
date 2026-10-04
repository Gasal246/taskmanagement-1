import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDepartment_areas extends Document {
    _id: Types.ObjectId;
    area_id: Types.ObjectId | null;
    dep_id: Types.ObjectId | null;
    status: Number | null;
    dep_region_id: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const Department_areasSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  dep_region_id: { type: Schema.Types.ObjectId, ref: "department_regions" },
  dep_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
  status: { type: Number },
}, { timestamps: true });

Department_areasSchema.index({ dep_id: 1, status: 1, _id: 1 });

const Department_areas = mongoose.models?.department_areas || mongoose.model<IDepartment_areas>('department_areas', Department_areasSchema);

export default Department_areas;

