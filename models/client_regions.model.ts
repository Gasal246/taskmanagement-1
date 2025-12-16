import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IClient_regions extends Document {
  client_id: ObjectId | null;
  region_id: ObjectId | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Client_regionsSchema: Schema = new Schema({
  client_id: { type: Schema.Types.ObjectId },
  region_id: { type: Schema.Types.ObjectId },
  status: { type: Number, enum: [0, 1], default: 1 },
}, {
  timestamps: true,
});

const Client_regions = mongoose.models?.client_regions || mongoose.model<IClient_regions>('client_regions', Client_regionsSchema);

export default Client_regions;

