import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness extends Document {
  _id: ObjectId;
  business_phone: String | null;
  business_email: String | null;
  business_country: String | null;
  business_name: String | null;
  business_province: String | null;
  business_city: String | null;
  business_pin: String | null;
  business_logo: String | null;
  status: Number;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema: Schema = new Schema({
  business_phone: { type: String },
  business_email: { type: String },
  business_country: { type: String },
  business_name: { type: String },
  business_province: { type: String },
  business_city: { type: String },
  business_pin: { type: String },
  business_logo: { type: String },
  status: { type: Number, default: 1, enum: [0, 1] }, // 0: inactive, 1: active
}, { timestamps: true });

const Business = mongoose.models?.business || mongoose.model<IBusiness>('business', BusinessSchema);

export default Business;

