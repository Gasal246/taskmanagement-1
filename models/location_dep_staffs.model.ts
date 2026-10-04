import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation_dep_staffs extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId | null;
  location_dep_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_dep_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  location_dep_id: { type: Schema.Types.ObjectId, ref:"location_departments" },
  status: { type: Number },
}, { timestamps: true });

Location_dep_staffsSchema.index({ location_dep_id: 1, status: 1, _id: 1 });
Location_dep_staffsSchema.index({ user_id: 1, location_dep_id: 1, status: 1 });

const Location_dep_staffs = mongoose.models?.location_dep_staffs || mongoose.model<ILocation_dep_staffs>('location_dep_staffs', Location_dep_staffsSchema);

export default Location_dep_staffs;

