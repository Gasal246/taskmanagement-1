import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_areas extends Document {
  _id: ObjectId;
  area_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const User_areasSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const User_areas = mongoose.models?.user_areas || mongoose.model<IUser_areas>('user_areas', User_areasSchema);

export default User_areas;

