import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_departments extends Document {
    _id: ObjectId;
    status: Number | null;
    business_id: ObjectId | null;
    dep_name: String | null;
    createdAt: Date;
    updatedAt: Date;
}

const Business_departmentsSchema: Schema = new Schema({
    status: { type: Number, default: 1, enum: [0, 1] },
    business_id: { type: Schema.Types.ObjectId, ref: "business" },
    dep_name: { type: String },
}, { timestamps: true });

const Business_departments = mongoose.models?.business_departments || mongoose.model<IBusiness_departments>('business_departments', Business_departmentsSchema);

export default Business_departments;

