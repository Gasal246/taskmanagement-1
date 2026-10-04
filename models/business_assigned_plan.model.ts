import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness_assigned_plans extends Document {
    _id: Types.ObjectId;
    plan_id: Types.ObjectId | null;
    business_id: Types.ObjectId | null;
    status: Number | null;
    createdAt: Date;
    updatedAt: Date;
}

const Business_assigned_plansSchema: Schema = new Schema({
    status: { type: Number, default: 1, enum: [0, 1] },
    plan_id: { type: Schema.Types.ObjectId, ref: "superadmin_plans" },
    business_id: { type: Schema.Types.ObjectId, ref: "business" },
}, { timestamps: true });

const Business_assigned_plans = mongoose.models?.business_assigned_plans || mongoose.model<IBusiness_assigned_plans>('business_assigned_plans', Business_assigned_plansSchema);

export default Business_assigned_plans;

