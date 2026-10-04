import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUsers extends Document {
  _id: Types.ObjectId;
  phone: String | null;
  password: String | null;
  email: String | null;
  name: String | null;
  admin_id: Types.ObjectId | null;
  status: Number;
  avatar_url: String | null;
  otp: String | null;
  session_version: number;
  last_login: Date | null;
  last_logout: Date | null;
  createdAt: Date;
  updateAt: Date;
}

const UsersSchema: Schema = new Schema({
  phone: { type: String },
  password: { type: String, select: false },
  email: { type: String, trim: true, lowercase: true, index: true },
  name: { type: String },
  admin_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, default: 1, enum: [0, 1] },
  avatar_url: { type: String },
  otp: { type: String, select: false },
  session_version: { type: Number, default: 0, select: false },
  last_login: { type: Date, default: null },
  last_logout: { type: Date, default: null },
}, { timestamps: true });

const Users = mongoose.models?.users || mongoose.model<IUsers>('users', UsersSchema);

export default Users;
