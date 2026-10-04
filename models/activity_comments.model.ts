import mongoose, { Document, Types, Schema } from "mongoose";

export interface IActivityComment extends Document {
  _id: Types.ObjectId;
  task_id: Types.ObjectId;
  activity_id: Types.ObjectId;
  author_id: Types.ObjectId;
  parent_id: Types.ObjectId | null;
  root_id: Types.ObjectId | null;
  depth: number;
  body: string;
  attachment: {
    url: string;
    storage_path: string;
    name: string;
    mime_type: string;
    extension: string;
    size: number;
  } | null;
  deleted_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityCommentAttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    storage_path: { type: String, required: true },
    name: { type: String, required: true },
    mime_type: { type: String, required: true },
    extension: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const ActivityCommentSchema = new Schema<IActivityComment>(
  {
    task_id: { type: Schema.Types.ObjectId, ref: "business_tasks", required: true },
    activity_id: { type: Schema.Types.ObjectId, ref: "task_activities", required: true },
    author_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "activity_comments", default: null },
    root_id: { type: Schema.Types.ObjectId, ref: "activity_comments", default: null },
    depth: { type: Number, min: 0, max: 2, required: true, default: 0 },
    body: { type: String, default: "", trim: true, maxlength: 2000 },
    attachment: { type: ActivityCommentAttachmentSchema, default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

ActivityCommentSchema.index({ activity_id: 1, createdAt: 1 });
ActivityCommentSchema.index({ task_id: 1 });
ActivityCommentSchema.index({ parent_id: 1 });
ActivityCommentSchema.index({ "attachment.storage_path": 1 }, { sparse: true });

const ActivityComments =
  mongoose.models?.activity_comments ||
  mongoose.model<IActivityComment>("activity_comments", ActivityCommentSchema);

export default ActivityComments;
