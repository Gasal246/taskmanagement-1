import mongoose, { Schema } from "mongoose";
const schema = new Schema({ _id: String, last_seen_at: Date }, { versionKey: false });
export default mongoose.models.worker_heartbeats || mongoose.model("worker_heartbeats", schema);
