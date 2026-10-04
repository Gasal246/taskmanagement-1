import mongoose, { Schema } from "mongoose";
const schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "users", unique: true, required: true },
  reminders_enabled: { type: Boolean, default: true },
  reminder_hours: { type: Number, enum: [24, 48, 72], default: 24 },
  email_fallback: { type: Boolean, default: false },
}, { timestamps: true });
export default mongoose.models.notification_preferences || mongoose.model("notification_preferences", schema);
