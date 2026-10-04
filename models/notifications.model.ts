import mongoose, { Document, Types, Schema } from "mongoose";

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
  archived_at: Date | null;
  expires_at: Date | null;
  action_required: boolean;
  snoozed_until: Date | null;
  next_reminder_at: Date | null;
  reminder_count: number;
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
    archived_at: { type: Date, default: null },
    expires_at: { type: Date, default: null },
    action_required: { type: Boolean, default: false },
    snoozed_until: { type: Date, default: null },
    next_reminder_at: { type: Date, default: null },
    reminder_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ action_required: 1, read_at: 1, next_reminder_at: 1 });

NotificationSchema.index({ recipient_id: 1, archived_at: 1, read_at: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ recipient_id: 1, archived_at: 1, createdAt: -1, _id: -1 });

const Notifications =
  mongoose.models?.notifications ||
  mongoose.model<INotification>("notifications", NotificationSchema);

export default Notifications;
