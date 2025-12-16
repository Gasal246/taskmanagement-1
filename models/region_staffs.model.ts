import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRegion_staffs extends Document {
  _id: ObjectId;
  region_id: ObjectId | null;
  staff_id: ObjectId | null;
  status: Number | null;
}

const Region_staffsSchema: Schema = new Schema({
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

const Region_staffs = mongoose.models?.region_staffs || mongoose.model<IRegion_staffs>('region_staffs', Region_staffsSchema);

export default Region_staffs;

// Anas Used