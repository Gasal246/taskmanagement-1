import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IUser_details extends Document {
    _id: ObjectId;
    user_id: ObjectId | null;
    country: String | null;
    province: String | null;
    national_id: String | null;
    gender: String | null;
    dob: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const User_detailsSchema: Schema = new Schema({
    gender: { type: String },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    country: { type: String },
    province: { type: String },
    national_id: { type: String },
    dob: { type: Date },
}, { timestamps: true });

const User_details = mongoose.models?.user_details || mongoose.model<IUser_details>('user_details', User_detailsSchema);

export default User_details;

