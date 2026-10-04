import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness_departments extends Document {
    _id: Types.ObjectId;
    status: Number | null;
    business_id: Types.ObjectId | null;
    dep_name: String | null;
    createdAt: Date;
    updatedAt: Date;
}

const Business_departmentsSchema: Schema = new Schema({
    status: { type: Number, default: 1, enum: [0, 1] },
    business_id: { type: Schema.Types.ObjectId, ref: "business" },
    dep_name: { type: String },
}, { timestamps: true });

Business_departmentsSchema.index({ business_id: 1, status: 1, _id: 1 });

const Business_departments = mongoose.models?.business_departments || mongoose.model<IBusiness_departments>('business_departments', Business_departmentsSchema);

export default Business_departments;

