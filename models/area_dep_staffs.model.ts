import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IArea_dep_staffs extends Document {
  _id: ObjectId;
  user_id: ObjectId | null;
  status: Number | null;
  area_dep_id: ObjectId | null;
  createAt: Date;
  updatedAt: Date;
}

const Area_dep_staffsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId },
  status: { type: Number, enum: [0, 1], default: 1 },
  area_dep_id: { type: Schema.Types.ObjectId },
}, { timestamps: true });

const Area_dep_staffs = mongoose.models?.area_dep_staffs || mongoose.model<IArea_dep_staffs>('area_dep_staffs', Area_dep_staffsSchema);

export default Area_dep_staffs;

