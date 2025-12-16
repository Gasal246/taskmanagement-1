import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_skills extends Document {
    _id: ObjectId;
    skill_id: ObjectId | null;
    user_id: ObjectId | null;
    status: Number | null;
    createdAt: Date;
    updatedAt: Date;
}

const User_skillsSchema: Schema = new Schema({
  status: { type: Number, default: 1, enum: [0, 1] },
  skill_id: { type: Schema.Types.ObjectId, ref: "business_skills" },
  user_id: { type: Schema.Types.ObjectId, ref: "users" },
}, { timestamps: true });

const User_skills = mongoose.models?.user_skills || mongoose.model<IUser_skills>('user_skills', User_skillsSchema);

export default User_skills;

