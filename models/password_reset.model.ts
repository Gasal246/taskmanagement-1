import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users", required: true, unique: true },
  token_hash: { type: String, required: true, select: false },
  kind: { type: String, enum: ["otp", "link", "grant"], required: true },
  expires_at: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.password_reset || mongoose.model("password_reset", schema);
