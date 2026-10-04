import mongoose, { Document, Types, Schema } from "mongoose";
import { NOTIFICATION_RETENTION_SECONDS } from "@/lib/constants";

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient_id: Types.ObjectId;
  sender_id: Types.ObjectId | null;
  kind: string;
  title: string;
  body: string;
  data: Record<string, any>;
  meta: Record<string, any>;
  read_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient_id: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    sender_id: { type: Schema.Types.ObjectId, ref: "users", default: null },
    kind: { type: String, default: "general", index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    data: { type: Schema.Types.Mixed, default: {} },
    meta: { type: Schema.Types.Mixed, default: {} },
    read_at: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS }
);

NotificationSchema.index({ recipient_id: 1, read_at: 1, createdAt: -1 });
NotificationSchema.index({ recipient_id: 1, createdAt: -1 });

const Notifications =
  mongoose.models?.notifications ||
  mongoose.model<INotification>("notifications", NotificationSchema);

export default Notifications;
