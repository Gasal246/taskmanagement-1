import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRegion_dep_heads extends Document {
  _id: ObjectId;
  reg_dep_id: ObjectId | null;
  user_id: ObjectId | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const Region_dep_headsSchema: Schema = new Schema({
  reg_dep_id: { type: Schema.Types.ObjectId, ref: "region_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Region_dep_heads = mongoose.models?.region_dep_heads || mongoose.model<IRegion_dep_heads>('region_dep_heads', Region_dep_headsSchema);

export default Region_dep_heads;

