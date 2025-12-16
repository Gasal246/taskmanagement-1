import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IArea_heads extends Document {
  area_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
}

const Area_headsSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Area_heads = mongoose.models?.area_heads || mongoose.model<IArea_heads>('area_heads', Area_headsSchema);

export default Area_heads;

