import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_regions extends Document {
  _id: ObjectId;
  region_id: ObjectId | null;
  user_id: ObjectId | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

const User_regionsSchema: Schema = new Schema({
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const User_regions = mongoose.models?.user_regions || mongoose.model<IUser_regions>('user_regions', User_regionsSchema);

export default User_regions;

