import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IClient_contacts extends Document {
  client_id: ObjectId | null;
  contact_name: String | null;
  designation: String | null;
  email: String | null;
  phone: String | null;
  _id: ObjectId;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const Client_contactsSchema: Schema = new Schema({
  client_id: { type: Schema.Types.ObjectId },
  contact_name: { type: String },
  designation: { type: String },
  email: { type: String },
  phone: { type: String },
  status: { type: Number, enum: [0, 1], default: 1 },
}, {
  timestamps: true,
});

const Client_contacts = mongoose.models?.client_contacts || mongoose.model<IClient_contacts>('client_contacts', Client_contactsSchema);

export default Client_contacts;

