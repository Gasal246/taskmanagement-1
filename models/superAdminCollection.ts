import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ISuperadmin extends Document {
  _id: ObjectId;
  name: String;
  email: String;
  password: String;
  superadmin_id: String;
  is_super: Boolean;
}

const SuperadminSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  superadmin_id: { type: String },
  is_super: { type: Boolean, default: true },
}, { timestamps: true });

const Superadmin = mongoose?.models?.superadmin || mongoose.model<ISuperadmin>('superadmin', SuperadminSchema);

export default Superadmin;

