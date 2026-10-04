import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDepartment_heads extends Document {
  _id: Types.ObjectId;
  dep_id: Types.ObjectId | null;
  status: Number | null;
  user_id: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const Department_headsSchema: Schema = new Schema({
  dep_id: { type: Schema.Types.ObjectId, ref: "business_departments" },
  status: { type: Number },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
}, { timestamps: true });

Department_headsSchema.index({ dep_id: 1, status: 1, _id: 1 });
Department_headsSchema.index({ user_id: 1, dep_id: 1, status: 1 });

const Department_heads = mongoose.models?.department_heads || mongoose.model<IDepartment_heads>('department_heads', Department_headsSchema);

export default Department_heads;

