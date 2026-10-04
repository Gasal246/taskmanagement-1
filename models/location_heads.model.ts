import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation_heads extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | null;
  location_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_headsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_id: { type: Schema.Types.ObjectId, ref: "business_locations" },
  status: { type: Number },
}, { timestamps: true });

Location_headsSchema.index({ location_id: 1, status: 1, _id: 1 });
Location_headsSchema.index({ user_id: 1, location_id: 1, status: 1 });

const Location_heads = mongoose.models?.location_heads || mongoose.model<ILocation_heads>('location_heads', Location_headsSchema);

export default Location_heads;

