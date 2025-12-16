import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation_staffs extends Document {
  user_id: ObjectId | null;
  location_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Location_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Location_staffs = mongoose.models?.location_staffs || mongoose.model<ILocation_staffs>('location_staffs', Location_staffsSchema);

export default Location_staffs;

