import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArea_dep_heads extends Document {
  _id: Types.ObjectId;
  area_dep_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number | null;
  createAt: Date;
  updatedAt: Date;
}

const Area_dep_headsSchema: Schema = new Schema({
  area_dep_id: { type: Schema.Types.ObjectId, ref: "area_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Area_dep_headsSchema.index({ area_dep_id: 1, status: 1, _id: 1 });
Area_dep_headsSchema.index({ user_id: 1, area_dep_id: 1, status: 1 });

const Area_dep_heads = mongoose.models?.area_dep_heads || mongoose.model<IArea_dep_heads>('area_dep_heads', Area_dep_headsSchema);

export default Area_dep_heads;

