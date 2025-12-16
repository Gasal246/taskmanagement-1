import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation_dep_heads extends Document {
  _id: ObjectId;
  location_dep_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_dep_headsSchema: Schema = new Schema({
  location_dep_id: { type: Schema.Types.ObjectId },
  user_id: { type: Schema.Types.ObjectId },
  status: { type: Number },
}, { timestamps: true });

const Location_dep_heads = mongoose.models?.location_dep_heads || mongoose.model<ILocation_dep_heads>('location_dep_heads', Location_dep_headsSchema);

export default Location_dep_heads;

