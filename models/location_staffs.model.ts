import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation_staffs extends Document {
  user_id: Types.ObjectId | null;
  location_id: Types.ObjectId | null;
  status: Number | null;
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Location_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Location_staffsSchema.index({ location_id: 1, status: 1, _id: 1 });
Location_staffsSchema.index({ user_id: 1, location_id: 1, status: 1 });

const Location_staffs = mongoose.models?.location_staffs || mongoose.model<ILocation_staffs>('location_staffs', Location_staffsSchema);

export default Location_staffs;

