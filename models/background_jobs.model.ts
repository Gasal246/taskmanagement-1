import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  dedupe_key: { type: String, required: true, unique: true },
  kind: { type: String, required: true, enum: ["notification", "push", "storage-delete"] },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  attempts: { type: Number, default: 0 },
  available_at: { type: Date, default: Date.now },
  lease_until: { type: Date, default: null },
  lease_token: { type: String, default: null },
  last_error: { type: String, default: null },
  completed_at: { type: Date, default: null },
  purge_at: { type: Date, default: null },
  retry_count: { type: Number, default: 0 },
  last_retry_by: { type: Schema.Types.ObjectId, ref: "users", default: null },
  retried_at: { type: Date, default: null },
}, { timestamps: true });
schema.index({ status: 1, available_at: 1, createdAt: 1 });
schema.index({ status: 1, lease_until: 1 });
schema.index({ status: 1, createdAt: -1, _id: -1 });
schema.index({ purge_at: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.background_jobs || mongoose.model("background_jobs", schema);
