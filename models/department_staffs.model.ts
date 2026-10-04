import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDep_staffs extends Document {
  _id: Types.ObjectId;
  dep_id: Types.ObjectId | null;
  staff_id: Types.ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Dep_staffsSchema: Schema = new Schema({
  dep_id: { type: Schema.Types.ObjectId },
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

Dep_staffsSchema.index({ dep_id: 1, status: 1, _id: 1 });
Dep_staffsSchema.index({ staff_id: 1, dep_id: 1, status: 1 });

const Dep_staffs = mongoose.models?.dep_staffs || mongoose.model<IDep_staffs>('dep_staffs', Dep_staffsSchema);

export default Dep_staffs;

