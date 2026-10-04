import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation_dep_heads extends Document {
  _id: Types.ObjectId;
  location_dep_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_dep_headsSchema: Schema = new Schema({
  location_dep_id: { type: Schema.Types.ObjectId, ref: "location_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number },
}, { timestamps: true });

Location_dep_headsSchema.index({ location_dep_id: 1, status: 1, _id: 1 });
Location_dep_headsSchema.index({ user_id: 1, location_dep_id: 1, status: 1 });

const Location_dep_heads = mongoose.models?.location_dep_heads || mongoose.model<ILocation_dep_heads>('location_dep_heads', Location_dep_headsSchema);

export default Location_dep_heads;

