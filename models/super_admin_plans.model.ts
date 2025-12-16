import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ISuperadmin_plans extends Document {
  _id: ObjectId;
  plan_name: String | null;
  deps_count: Number | null;
  staff_count: Number | null;
  region_count: Number | null;
  is_custom: Boolean | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Superadmin_plansSchema: Schema = new Schema({
  plan_name: { type: String },
  deps_count: { type: Number },
  staff_count: { type: Number },
  region_count: { type: Number },
  is_custom: { type: Boolean, default: false },
  status: { type: Number, default: 1 },
}, { timestamps: true });

const Superadmin_plans = mongoose.models?.superadmin_plans || mongoose.model<ISuperadmin_plans>('superadmin_plans', Superadmin_plansSchema);

export default Superadmin_plans;

