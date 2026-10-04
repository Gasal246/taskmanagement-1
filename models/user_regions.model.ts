import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser_regions extends Document {
  _id: Types.ObjectId;
  region_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

const User_regionsSchema: Schema = new Schema({
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

User_regionsSchema.index({ region_id: 1, status: 1, _id: 1 });

const User_regions = mongoose.models?.user_regions || mongoose.model<IUser_regions>('user_regions', User_regionsSchema);

export default User_regions;

