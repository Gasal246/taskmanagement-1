import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArea_heads extends Document {
  area_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number | null;
  _id: Types.ObjectId;
}

const Area_headsSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Area_headsSchema.index({ area_id: 1, status: 1, _id: 1 });
Area_headsSchema.index({ user_id: 1, area_id: 1, status: 1 });

const Area_heads = mongoose.models?.area_heads || mongoose.model<IArea_heads>('area_heads', Area_headsSchema);

export default Area_heads;

