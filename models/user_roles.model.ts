import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser_roles extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | null;
  role_id: Types.ObjectId | null;
  business_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const User_rolesSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  role_id: { type: Schema.Types.ObjectId, ref: "roles" },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, default: 1, enum: [0, 1] }, // 0: deleted, 1: active
}, { timestamps: true });

User_rolesSchema.index({ user_id: 1, status: 1, business_id: 1 });

const User_roles = mongoose.models?.user_roles || mongoose.model<IUser_roles>('user_roles', User_rolesSchema);

export default User_roles;

