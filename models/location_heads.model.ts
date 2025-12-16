import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation_heads extends Document {
  _id: ObjectId;
  user_id: ObjectId | null;
  location_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Location_headsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId },
  location_id: { type: Schema.Types.ObjectId },
  status: { type: Number },
}, { timestamps: true });

const Location_heads = mongoose.models?.location_heads || mongoose.model<ILocation_heads>('location_heads', Location_headsSchema);

export default Location_heads;

