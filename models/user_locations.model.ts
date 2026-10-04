import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser_locations extends Document {
  user_id: Types.ObjectId | null;
  location_id: Types.ObjectId | null;
  status: Number | null;
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const User_locationsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

User_locationsSchema.index({ location_id: 1, status: 1, _id: 1 });

const User_locations = mongoose.models?.user_locations || mongoose.model<IUser_locations>('user_locations', User_locationsSchema);

export default User_locations;

