import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegion_dep_heads extends Document {
  _id: Types.ObjectId;
  reg_dep_id: Types.ObjectId | null;
  user_id: Types.ObjectId | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const Region_dep_headsSchema: Schema = new Schema({
  reg_dep_id: { type: Schema.Types.ObjectId, ref: "region_departments" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

Region_dep_headsSchema.index({ reg_dep_id: 1, status: 1, _id: 1 });
Region_dep_headsSchema.index({ user_id: 1, reg_dep_id: 1, status: 1 });

const Region_dep_heads = mongoose.models?.region_dep_heads || mongoose.model<IRegion_dep_heads>('region_dep_heads', Region_dep_headsSchema);

export default Region_dep_heads;

