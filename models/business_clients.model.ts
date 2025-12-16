import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_clients extends Document {
  _id: ObjectId;
  client_name: String | null;
  short_name: String | null;
  business_id: ObjectId | null;
  category: String | null;
  industry: String | null;
  business_type: String | null;
  tax_number: String | null;
  company_address: String | null;
  billing_address: String | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Business_clientsSchema: Schema = new Schema({
  client_name: { type: String },
  short_name: { type: String },
  category: { type: String },
  industry: { type: String },
  business_type: { type: String },
  tax_number: { type: String },
  company_address: { type: String },
  billing_address: { type: String },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, {
  timestamps: true,
});

const Business_clients = mongoose.models?.business_clients || mongoose.model<IBusiness_clients>('business_clients', Business_clientsSchema);

export default Business_clients;

