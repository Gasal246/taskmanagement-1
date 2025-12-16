import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDepartment_areas extends Document {
    _id: ObjectId;
    area_id: ObjectId | null;
    dep_id: ObjectId | null;
    status: Number | null;
    dep_region_id: ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const Department_areasSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  dep_region_id: { type: Schema.Types.ObjectId, ref: "department_regions" },
  dep_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
  status: { type: Number },
}, { timestamps: true });

const Department_areas = mongoose.models?.department_areas || mongoose.model<IDepartment_areas>('department_areas', Department_areasSchema);

export default Department_areas;

