import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDep_staffs extends Document {
  _id: ObjectId;
  dep_id: ObjectId | null;
  staff_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Dep_staffsSchema: Schema = new Schema({
  dep_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
  staff_id: { type: Schema.Types.ObjectId, ref: "users" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Dep_staffs = mongoose.models?.dep_staffs || mongoose.model<IDep_staffs>('dep_staffs', Dep_staffsSchema);

export default Dep_staffs;

