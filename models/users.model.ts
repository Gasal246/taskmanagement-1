import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUsers extends Document {
  _id: ObjectId;
  phone: String | null;
  password: String | null;
  email: String | null;
  name: String | null;
  admin_id: ObjectId | null;
  status: Number;
  avatar_url: String | null;
  otp: String | null;
  createdAt: Date;
  updateAt: Date;
}

const UsersSchema: Schema = new Schema({
  phone: { type: String },
  password: { type: String },
  email: { type: String },
  name: { type: String },
  admin_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, default: 1, enum: [0, 1] },
  avatar_url: { type: String },
  otp: { type: String },
}, { timestamps: true });

const Users = mongoose.models?.users || mongoose.model<IUsers>('users', UsersSchema);

export default Users;

