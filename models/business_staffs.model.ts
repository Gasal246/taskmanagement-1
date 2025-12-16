import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_staffs extends Document {
  user_id: ObjectId | null;
  business_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Business_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, default: 1, enum: [0, 1, 2, 3] }, // 0: deleted, 1: active, 2: OnLeave, 3: Suspended / blocked
}, { timestamps: true });

const Business_staffs = mongoose.models?.business_staffs || mongoose.model<IBusiness_staffs>('business_staffs', Business_staffsSchema);

export default Business_staffs;

