import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDepartment_regions extends Document {
    _id: ObjectId;
    status: Number | null;
    business_region_id: ObjectId | null;
    department_id: ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const Department_regionsSchema: Schema = new Schema({
  status: { type: Number, default: 1, enum: [0, 1] },
  business_region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  department_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
}, { timestamps: true });

const Department_regions = mongoose.models?.department_regions || mongoose.model<IDepartment_regions>('department_regions', Department_regionsSchema);

export default Department_regions;

