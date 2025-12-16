import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_roles extends Document {
  _id: ObjectId;
  user_id: ObjectId | null;
  role_id: ObjectId | null;
  business_id: ObjectId | null;
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

const User_roles = mongoose.models?.user_roles || mongoose.model<IUser_roles>('user_roles', User_rolesSchema);

export default User_roles;

