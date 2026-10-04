import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDepartment_regions extends Document {
    _id: Types.ObjectId;
    status: Number | null;
    business_region_id: Types.ObjectId | null;
    department_id: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const Department_regionsSchema: Schema = new Schema({
  status: { type: Number, default: 1, enum: [0, 1] },
  business_region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  department_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
}, { timestamps: true });

Department_regionsSchema.index({ department_id: 1, status: 1, _id: 1 });
Department_regionsSchema.index({ business_region_id: 1, department_id: 1, status: 1 });

const Department_regions = mongoose.models?.department_regions || mongoose.model<IDepartment_regions>('department_regions', Department_regionsSchema);

export default Department_regions;

