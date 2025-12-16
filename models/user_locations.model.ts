import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_locations extends Document {
  user_id: ObjectId | null;
  location_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const User_locationsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const User_locations = mongoose.models?.user_locations || mongoose.model<IUser_locations>('user_locations', User_locationsSchema);

export default User_locations;

