import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_skills extends Document {
  business_id: ObjectId | null;
  skill_name: String | null;
  status: Number | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const Business_skillsSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  skill_name: { type: String },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

const Business_skills = mongoose.models?.business_skills || mongoose.model<IBusiness_skills>('business_skills', Business_skillsSchema);

export default Business_skills;

