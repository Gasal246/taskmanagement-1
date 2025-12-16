import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IAdmin_assign_business extends Document {
  _id: ObjectId;
  business_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const Admin_assign_businessSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1 },
}, { timestamps: true });

const Admin_assign_business = mongoose.models?.admin_assign_business || mongoose.model<IAdmin_assign_business>('admin_assign_business', Admin_assign_businessSchema);

export default Admin_assign_business;

