import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IDepartment_heads extends Document {
  _id: ObjectId;
  dep_id: ObjectId | null;
  status: Number | null;
  user_id: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const Department_headsSchema: Schema = new Schema({
  dep_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
  status: { type: Number },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
}, { timestamps: true });

const Department_heads = mongoose.models?.department_heads || mongoose.model<IDepartment_heads>('department_heads', Department_headsSchema);

export default Department_heads;

