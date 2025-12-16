import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation_dep_staffs extends Document {
  _id: ObjectId;
  user_id: ObjectId | null;
  location_dep_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_dep_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId },
  location_dep_id: { type: Schema.Types.ObjectId, ref:"location_departments" },
  status: { type: Number },
}, { timestamps: true });

const Location_dep_staffs = mongoose.models?.location_dep_staffs || mongoose.model<ILocation_dep_staffs>('location_dep_staffs', Location_dep_staffsSchema);

export default Location_dep_staffs;

