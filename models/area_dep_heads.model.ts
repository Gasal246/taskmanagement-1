import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IArea_dep_heads extends Document {
  _id: ObjectId;
  area_dep_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number | null;
  createAt: Date;
  updatedAt: Date;
}

const Area_dep_headsSchema: Schema = new Schema({
  area_dep_id: { type: Schema.Types.ObjectId, ref: "area_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Area_dep_heads = mongoose.models?.area_dep_heads || mongoose.model<IArea_dep_heads>('area_dep_heads', Area_dep_headsSchema);

export default Area_dep_heads;

