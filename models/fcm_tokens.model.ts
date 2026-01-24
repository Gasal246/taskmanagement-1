import mongoose, { Document, ObjectId, Schema } from "mongoose";

export interface IFcmToken extends Document {
  _id: ObjectId;
  user_id: ObjectId;
  token: string;
  platform: string | null;
  device: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const FcmTokenSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: null },
    device: { type: String, default: null },
  },
  { timestamps: true }
);

const FcmTokens =
  mongoose.models?.fcm_tokens ||
  mongoose.model<IFcmToken>("fcm_tokens", FcmTokenSchema);

export default FcmTokens;
