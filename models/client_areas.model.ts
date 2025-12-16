import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IClient_areas extends Document {
  area_id: ObjectId | null;
  client_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Client_areasSchema: Schema = new Schema({
  area_id: { type: Schema.Types.ObjectId },
  client_id: { type: Schema.Types.ObjectId },
  status: { type: Number, enum: [0, 1], default: 1 },
}, {
  timestamps: true,
});

const Client_areas = mongoose.models?.client_areas || mongoose.model<IClient_areas>('client_areas', Client_areasSchema);

export default Client_areas;

