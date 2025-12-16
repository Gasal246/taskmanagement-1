import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_docs extends Document {
  user_id: ObjectId | null;
  doc_name: String | null;
  doc_url: String | null;
  expire_date: Date | null;
  doc_type?: String | null;
  storage_path?: String | null;
  status?: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const User_docsSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
  doc_name: { type: String },
  doc_url: { type: String },
  expire_date: { type: Date },
  doc_type: { type: String },
  storage_path: { type: String },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const User_docs = mongoose.models?.user_docs || mongoose.model<IUser_docs>('user_docs', User_docsSchema);

export default User_docs;
