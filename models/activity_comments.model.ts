import mongoose, { Document, ObjectId, Schema } from "mongoose";

export interface IActivityComment extends Document {
  _id: ObjectId;
  task_id: ObjectId;
  activity_id: ObjectId;
  author_id: ObjectId;
  parent_id: ObjectId | null;
  root_id: ObjectId | null;
  depth: number;
  body: string;
  deleted_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityCommentSchema = new Schema<IActivityComment>(
  {
    task_id: { type: Schema.Types.ObjectId, ref: "business_tasks", required: true },
    activity_id: { type: Schema.Types.ObjectId, ref: "task_activities", required: true },
    author_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "activity_comments", default: null },
    root_id: { type: Schema.Types.ObjectId, ref: "activity_comments", default: null },
    depth: { type: Number, min: 0, max: 2, required: true, default: 0 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

ActivityCommentSchema.index({ activity_id: 1, createdAt: 1 });
ActivityCommentSchema.index({ task_id: 1 });
ActivityCommentSchema.index({ parent_id: 1 });

const ActivityComments =
  mongoose.models?.activity_comments ||
  mongoose.model<IActivityComment>("activity_comments", ActivityCommentSchema);

export default ActivityComments;
