import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_docs extends Document {
  _id: ObjectId;
  doc_url: String | null;
  business_id: ObjectId | null;
  doc_name: String | null;
  expires_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const Business_docsSchema: Schema = new Schema({
  doc_url: { type: String },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  doc_name: { type: String },
  expires_at: { type: Date },
}, { timestamps: true });

const Business_docs = mongoose.models?.business_docs || mongoose.model<IBusiness_docs>('business_docs', Business_docsSchema);

export default Business_docs;

