import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegion_staffs extends Document {
  _id: Types.ObjectId;
  region_id: Types.ObjectId | null;
  staff_id: Types.ObjectId | null;
  status: Number | null;
}

const Region_staffsSchema: Schema = new Schema({
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Region_staffsSchema.index({ region_id: 1, status: 1, _id: 1 });
Region_staffsSchema.index({ staff_id: 1, region_id: 1, status: 1 });

const Region_staffs = mongoose.models?.region_staffs || mongoose.model<IRegion_staffs>('region_staffs', Region_staffsSchema);

export default Region_staffs;

// Anas Used