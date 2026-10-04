import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdmin_assign_business extends Document {
  _id: Types.ObjectId;
  business_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const Admin_assign_businessSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1 },
}, { timestamps: true });

Admin_assign_businessSchema.index({ user_id: 1, status: 1, business_id: 1 });

const Admin_assign_business = mongoose.models?.admin_assign_business || mongoose.model<IAdmin_assign_business>('admin_assign_business', Admin_assign_businessSchema);

export default Admin_assign_business;

